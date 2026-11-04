"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ComponentProps,
  CSSProperties,
  DragEvent,
  FocusEvent,
  PointerEvent,
  ReactNode,
  RefObject,
} from "react";

import { DitherButton } from "@/components/dithercn/dither-button";
import { ProgressBar } from "@/components/dithercn/progress-bar";
import {
  bloomStyle,
  cssColor,
  isInked,
  thresholdAt,
  useDitherColors,
  useFrameLoop,
  usePrefersReducedMotion,
} from "@/lib/dither";
import type {
  Bloom,
  DitherColor,
  DitherMatrix,
  FillVariant,
  Rgba,
} from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * The border is a tone field on the cells along the zone's edge, painted
 * into a canvas one pixel per cell and scaled up without smoothing, as the
 * loader does. Every edge cell knows how deep it sits inside the rounded
 * box and how far along the perimeter it is, clockwise from the top left.
 * The dashes are a repeating tone along that distance: each one a solid
 * head with a tail that thins through the Bayer levels, so the outline
 * marches like a row of small comets. The dash count is rounded so the
 * pattern closes without a seam.
 *
 * One number, the energy, drives the drag-over look: it lengthens the
 * dashes, adds a second ring of cells inside the first, speeds the march
 * and pulls a dithered glow in from the edges, its front moving inward as
 * the energy rises. A second number crossfades the colour to red for a
 * rejected drag and stops the march. Both ease towards their targets each
 * frame, and snap to them under reduced motion.
 *
 * The illustration is drawn the way the Empty State draws its objects: a
 * lit tone field thresholded once into SVG paths. A sheet hovers over an
 * inbox tray; on drag-over it drops into the tray in whole-cell steps, and
 * on a reject it shakes a cell left and right.
 */

// ---------------------------------------------------------------------------
// Files

/** Why a file was turned away. */
export type DropzoneRejectReason =
  | "file-type"
  | "file-too-large"
  | "too-many-files";

/** A file that was dropped or picked but not accepted. */
export interface DropzoneRejection {
  file: File;
  reason: DropzoneRejectReason;
  /** A short sentence for the user, such as "Larger than 2 MB". */
  message: string;
}

/** What one drop or pick produced. */
export interface DropzoneFiles {
  accepted: File[];
  rejected: DropzoneRejection[];
}

interface Rules {
  accept: readonly string[];
  maxSize: number | undefined;
  limit: number;
}

const parseAccept = (accept: string | undefined): string[] =>
  (accept ?? "")
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token !== "");

/** Whether a name and MIME type match one `accept` token. Unknown types pass. */
const matchesToken = (token: string, name: string, type: string) => {
  if (token.startsWith(".")) {
    return name.toLowerCase().endsWith(token);
  }
  if (type === "") {
    return false;
  }
  if (token.endsWith("/*")) {
    return type.toLowerCase().startsWith(token.slice(0, -1));
  }
  return type.toLowerCase() === token;
};

const isAcceptedType = (
  accept: readonly string[],
  name: string,
  type: string
) =>
  accept.length === 0 ||
  accept.some((token) => matchesToken(token, name, type));

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

/** A file size for people: "840 KB", "4.2 MB". */
export const formatBytes = (bytes: number): string => {
  const units = [
    [GB, "GB"],
    [MB, "MB"],
    [KB, "KB"],
  ] as const;
  for (const [size, unit] of units) {
    if (bytes >= size) {
      const value = bytes / size;
      return `${value >= 10 ? Math.round(value) : Math.round(value * 10) / 10} ${unit}`;
    }
  }
  return `${bytes} B`;
};

const TYPE_NAMES: Readonly<Record<string, string>> = {
  "application/json": "JSON",
  "application/pdf": "PDF",
  "application/zip": "ZIP",
  "audio/*": "audio",
  "image/*": "images",
  "image/jpeg": "JPG",
  "image/svg+xml": "SVG",
  "text/*": "text",
  "text/csv": "CSV",
  "text/plain": "TXT",
  "video/*": "video",
};

const typeName = (token: string) => {
  const known = TYPE_NAMES[token];
  if (known !== undefined) {
    return known;
  }
  if (token.startsWith(".")) {
    return token.slice(1).toUpperCase();
  }
  const subtype = token.split("/")[1] ?? token;
  return subtype.replace(/^x-/u, "").replace(/\+.*$/u, "").toUpperCase();
};

const listOf = (items: readonly string[]) => {
  const unique = [...new Set(items)];
  if (unique.length < 2) {
    return unique.join("");
  }
  return `${unique.slice(0, -1).join(", ")} or ${unique.at(-1) ?? ""}`;
};

const typesLabel = (accept: readonly string[]) => listOf(accept.map(typeName));

/** The hint under the title when none is given: types, size and count. */
const defaultHint = ({ accept, maxSize, limit }: Rules) => {
  const parts: string[] = [];
  if (accept.length > 0) {
    const types = typesLabel(accept);
    parts.push(types.charAt(0).toUpperCase() + types.slice(1));
  }
  if (maxSize !== undefined) {
    parts.push(`up to ${formatBytes(maxSize)}${limit === 1 ? "" : " each"}`);
  }
  if (Number.isFinite(limit) && limit > 1) {
    parts.push(`${limit} files at most`);
  }
  if (parts.length === 0) {
    return limit === 1 ? "Any type of file" : "Any type of file, any number";
  }
  const [first = "", ...rest] = parts;
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(", ");
};

const rejectMessage = (reason: DropzoneRejectReason, rules: Rules) => {
  switch (reason) {
    case "file-type": {
      return `Only ${typesLabel(rules.accept)}`;
    }
    case "file-too-large": {
      return `Larger than ${formatBytes(rules.maxSize ?? 0)}`;
    }
    case "too-many-files": {
      return rules.limit === 1
        ? "One file at a time"
        : `${rules.limit} files at most`;
    }
    default: {
      const exhaustive: never = reason;
      return exhaustive;
    }
  }
};

/**
 * Split files into accepted and rejected, in order, against the rules.
 * More files than `limit` turns the whole batch away, as the red drag
 * state promised: taking the first few would be a guess.
 */
const sortFiles = (files: readonly File[], rules: Rules): DropzoneFiles => {
  const rejected: DropzoneRejection[] = [];
  const reject = (file: File, reason: DropzoneRejectReason) =>
    rejected.push({ file, message: rejectMessage(reason, rules), reason });
  const valid = files.filter((file) => {
    if (!isAcceptedType(rules.accept, file.name, file.type)) {
      reject(file, "file-type");
      return false;
    }
    if (rules.maxSize !== undefined && file.size > rules.maxSize) {
      reject(file, "file-too-large");
      return false;
    }
    return true;
  });
  if (files.length > rules.limit) {
    for (const file of valid) {
      reject(file, "too-many-files");
    }
    return { accepted: [], rejected };
  }
  return { accepted: valid, rejected };
};

/**
 * What a drag carries, read while it is over the zone. Browsers expose the
 * count and MIME types but not names or sizes, so a type the browser does
 * not report passes here and is checked on drop.
 */
const dragVerdict = (
  transfer: DataTransfer,
  rules: Rules
): { files: number; reason: DropzoneRejectReason | null } => {
  const items = [...transfer.items].filter((item) => item.kind === "file");
  const files = items.length;
  if (files > rules.limit) {
    return { files, reason: "too-many-files" };
  }
  const typed = rules.accept.filter((token) => !token.startsWith("."));
  const onlyMime = typed.length === rules.accept.length;
  if (
    onlyMime &&
    rules.accept.length > 0 &&
    items.some(
      (item) =>
        item.type !== "" &&
        !rules.accept.some((token) => matchesToken(token, "", item.type))
    )
  ) {
    return { files, reason: "file-type" };
  }
  return { files, reason: null };
};

const hasFiles = (transfer: DataTransfer | null) =>
  transfer !== null && [...transfer.types].includes("Files");

const announce = ({ accepted, rejected }: DropzoneFiles) => {
  const lines: string[] = [];
  if (accepted.length === 1) {
    lines.push(`Added ${accepted[0]?.name ?? "1 file"}.`);
  } else if (accepted.length > 1) {
    lines.push(
      `Added ${accepted.length} files: ${accepted.map((file) => file.name).join(", ")}.`
    );
  }
  // One sentence per reason: "Did not add 7 files: 5 files at most."
  const byMessage = new Map<string, DropzoneRejection[]>();
  for (const item of rejected) {
    byMessage.set(item.message, [...(byMessage.get(item.message) ?? []), item]);
  }
  for (const [message, items] of byMessage) {
    const [only] = items;
    const what =
      items.length === 1 && only ? only.file.name : `${items.length} files`;
    lines.push(
      `Did not add ${what}: ${message.charAt(0).toLowerCase()}${message.slice(1)}.`
    );
  }
  return lines.join(" ");
};

// ---------------------------------------------------------------------------
// The border field

const TAU = Math.PI * 2;
/** Cells per dash and gap, before rounding to close the loop. */
const DASH_PERIOD = 16;
/** How far the drag-over glow reaches in from the edge, in cells. */
const GLOW_REACH = 14;
/** Densest glow, at the edge, at full energy. */
const GLOW_PEAK = 0.4;
/** March speed in cells per second: at rest and at full energy. */
const MARCH = { active: 16, rest: 5 } as const;
/** Seconds for the energy to cover most of the way to its target. */
const EASE = { fall: 0.18, rise: 0.08 } as const;
/**
 * How long an accepted drop holds its flash. A rejection stays until the
 * next drag or pick, so a long filename can be read in full.
 */
const ACCEPT_HOLD_MS = 1100;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const fract = (value: number) => value - Math.floor(value);
const smoothstep = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

/** The cells along the edge, with their depth and distance round the loop. */
interface Band {
  cols: number;
  rows: number;
  /** Index into the pixel buffer. */
  index: Int32Array;
  x: Int16Array;
  y: Int16Array;
  /** Cells in from the edge: 0 for the outer ring, 1 for the next. */
  depth: Float32Array;
  /** Distance round the perimeter in dash periods, 0 to `dashes`. */
  along: Float32Array;
  dashes: number;
}

/**
 * Distance of a point round a rounded rectangle, clockwise from the start
 * of the top edge. `cx` and `cy` are the half sizes of the straight part.
 */
const perimeterAt = (
  px: number,
  py: number,
  cx: number,
  cy: number,
  r: number
) => {
  const arc = (r * Math.PI) / 2;
  const qx = Math.abs(px) - cx;
  const qy = Math.abs(py) - cy;
  if (qx > 0 && qy > 0) {
    if (px > 0 && py < 0) {
      return 2 * cx + r * Math.atan2(qx, qy);
    }
    if (px > 0) {
      return 2 * cx + 2 * cy + arc + r * Math.atan2(qy, qx);
    }
    if (py > 0) {
      return 4 * cx + 2 * cy + 2 * arc + r * Math.atan2(qx, qy);
    }
    return 4 * cx + 4 * cy + 3 * arc + r * Math.atan2(qy, qx);
  }
  // Inside the straight part on one axis: the nearer side wins.
  const toSideX = r + cx - Math.abs(px);
  const toSideY = r + cy - Math.abs(py);
  const sx = Math.min(cx, Math.max(-cx, px));
  const sy = Math.min(cy, Math.max(-cy, py));
  if (toSideY <= toSideX) {
    return py < 0 ? sx + cx : 2 * cx + 2 * cy + 2 * arc + (cx - sx);
  }
  return px > 0
    ? 2 * cx + arc + (sy + cy)
    : 4 * cx + 2 * cy + 3 * arc + (cy - sy);
};

const buildBand = (cols: number, rows: number, radius: number): Band => {
  const hw = cols / 2;
  const hh = rows / 2;
  const r = Math.max(0, Math.min(radius, hw, hh));
  const cx = hw - r;
  const cy = hh - r;
  const perimeter = 4 * cx + 4 * cy + TAU * r;
  const dashes = Math.max(4, Math.round(perimeter / DASH_PERIOD));
  const reach = GLOW_REACH + 2;
  const cells: number[][] = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const px = x + 0.5 - hw;
      const py = y + 0.5 - hh;
      const qx = Math.abs(px) - cx;
      const qy = Math.abs(py) - cy;
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
      const inside = Math.min(Math.max(qx, qy), 0);
      // Signed distance to the box edge, negative inside; the outer ring sits at -0.5.
      const depth = -(outside + inside - r) - 0.5;
      if (depth > -0.5 && depth < reach) {
        const along = (perimeterAt(px, py, cx, cy, r) / perimeter) * dashes;
        cells.push([y * cols + x, x, y, depth, along]);
      }
    }
  }
  return {
    along: Float32Array.from(cells, (cell) => cell[4] ?? 0),
    cols,
    dashes,
    depth: Float32Array.from(cells, (cell) => cell[3] ?? 0),
    index: Int32Array.from(cells, (cell) => cell[0] ?? 0),
    rows,
    x: Int16Array.from(cells, (cell) => cell[1] ?? 0),
    y: Int16Array.from(cells, (cell) => cell[2] ?? 0),
  };
};

/** The live values the border eases between. */
interface Energy {
  /** 0 at rest, about 0.3 on hover or focus, 1 with a file over the zone. */
  energy: number;
  /** 0 for the zone's colour, 1 for red. */
  reject: number;
  /** How far the dashes have marched, in cells. */
  march: number;
}

/** Tone of one edge cell. */
const borderTone = (
  depth: number,
  along: number,
  energy: number,
  marchPeriods: number
) => {
  // Phase within the dash period; the dash head leads, clockwise.
  const u = fract(along - marchPeriods);
  const duty = 0.5 + 0.22 * energy;
  const inDash = u < duty;
  const head = u / duty;
  const dash = inDash
    ? 0.2 + 0.28 * energy + (0.8 - 0.28 * energy) * head ** 1.3
    : 0.03 + 0.16 * energy;
  if (depth < 0.5) {
    return dash;
  }
  if (depth < 1.5) {
    // The second ring fades in with the energy, a little sparser than the first.
    return energy * (inDash ? 0.12 + 0.6 * head : 0.12);
  }
  // The glow: its front moves inward with the energy, and it is brightest behind each dash head.
  const front = GLOW_REACH * energy;
  const falloff = Math.exp(-(depth - 1.5) / (GLOW_REACH * 0.4));
  const reachIn = 1 - smoothstep(front - 4, front + 1, depth);
  const lit = 0.72 + 0.28 * Math.cos(TAU * (u - duty));
  return GLOW_PEAK * energy * falloff * reachIn * lit;
};

const toByte = (value: number) => Math.round(clamp01(value) * 255);

const mixColor = (from: Rgba, to: Rgba, amount: number): Rgba => [
  from[0] + (to[0] - from[0]) * amount,
  from[1] + (to[1] - from[1]) * amount,
  from[2] + (to[2] - from[2]) * amount,
  from[3] + (to[3] - from[3]) * amount,
];

interface PaintOptions {
  canvas: HTMLCanvasElement;
  frame: { current: ImageData | null };
  band: Band;
  thresholds: Float32Array;
  live: Energy;
  ink: Rgba;
}

const paintBorder = ({
  canvas,
  frame,
  band,
  thresholds,
  live,
  ink,
}: PaintOptions) => {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }
  if (
    frame.current?.width !== band.cols ||
    frame.current.height !== band.rows
  ) {
    frame.current = context.createImageData(band.cols, band.rows);
  }
  const { data } = frame.current;
  const [red = 0, green = 0, blue = 0, alpha = 255] = ink.map(toByte);
  const periods = live.march / DASH_PERIOD;
  for (let i = 0; i < band.index.length; i += 1) {
    const offset = (band.index[i] ?? 0) * 4;
    const tone = borderTone(
      band.depth[i] ?? 0,
      band.along[i] ?? 0,
      live.energy,
      periods
    );
    data[offset] = red;
    data[offset + 1] = green;
    data[offset + 2] = blue;
    data[offset + 3] = tone > (thresholds[i] ?? 1) ? alpha : 0;
  }
  context.putImageData(frame.current, 0, 0);
};

// ---------------------------------------------------------------------------
// The illustration

const ART_COLS = 44;
const ART_ROWS = 35;
/** The illustration's cell in CSS pixels: coarse, like the Empty State's objects. */
const ART_CELL = 3;
const ART_X = ART_COLS / 2;
/** Cells the sheet drops into the tray on drag-over. */
const DROP_CELLS = 4;

type Point = readonly [number, number];
type Shade = readonly [tone: number, part: number];
type ArtField = (x: number, y: number) => Shade | null;

const inPolygon = (x: number, y: number, points: readonly Point[]) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i] ?? [0, 0];
    const [xj, yj] = points[j] ?? [0, 0];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

/** The cut in the top of the tray's front, where the sheet goes in. */
const NOTCH = { bottom: 25, half: 7 } as const;
const FACE_TOP = 22;
const FRONT: readonly Point[] = [
  [3, FACE_TOP],
  [41, FACE_TOP],
  [40, 30],
  [4, 30],
];
const WELL: readonly Point[] = [
  [7, 17],
  [37, 17],
  [41, FACE_TOP],
  [3, FACE_TOP],
];

const inNotch = (x: number, y: number) =>
  Math.abs(x + 0.5 - ART_X) < NOTCH.half && y < NOTCH.bottom;

/** An inbox tray, lit from the top left: a lit front with a notch, a shaded well. */
const tray: ArtField = (x, y) => {
  const cx = x + 0.5;
  const cy = y + 0.5;
  if (inPolygon(cx, cy, FRONT) && !inNotch(x, y)) {
    // The rim along the top and round the notch catches the light.
    const rim =
      y === FACE_TOP ||
      (y <= NOTCH.bottom && Math.abs(cx - ART_X) < NOTCH.half + 1);
    if (rim) {
      return [0.96, 0];
    }
    // The face: lit from the left, falling off to the right and downward.
    const across = (cx - 3) / 38;
    return [clamp01(0.64 - 0.3 * across - (0.14 * (cy - FACE_TOP)) / 8), 1];
  }
  if (inPolygon(cx, cy, WELL) || (inNotch(x, y) && y >= FACE_TOP)) {
    if (y === 17) {
      return [0.78, 2];
    }
    // The well is in shadow, a little lighter at the back.
    return [clamp01(0.24 - (0.2 * (cy - 17)) / 5), 3];
  }
  return null;
};

const SHEET = { bottom: 21, fold: 5, left: 14, right: 30, top: 1 } as const;

/** A sheet of paper with a folded corner and an upward arrow knocked out of it. */
const sheet: ArtField = (x, y) => {
  if (
    x < SHEET.left ||
    x >= SHEET.right ||
    y < SHEET.top ||
    y >= SHEET.bottom
  ) {
    return null;
  }
  const intoCorner = x - (SHEET.right - SHEET.fold);
  const belowTop = y - SHEET.top;
  if (intoCorner >= 0 && belowTop < SHEET.fold) {
    // The fold faces away from the light; past it the corner is cut away.
    return intoCorner > belowTop ? null : [0.42, 1];
  }
  const ax = Math.abs(x + 0.5 - ART_X);
  const arrowHead = y >= 5 && y < 10 && ax < y - 4;
  const arrowStem = y >= 10 && y < 16 && ax < 2;
  if (arrowHead || arrowStem) {
    return [0, 2];
  }
  const fromTop = (y - SHEET.top) / (SHEET.bottom - SHEET.top);
  const fromLeft = (x - SHEET.left) / (SHEET.right - SHEET.left);
  return [clamp01(0.98 - 0.16 * fromTop - 0.1 * fromLeft), 0];
};

interface ArtPaths {
  tray: string;
  sheet: string;
  /** The sheet's outline grown by a cell, to clear the tray behind it. */
  sheetClear: string;
  backdrop: string;
}

const cellPath = (x: number, y: number) => `M${x} ${y}h1v1h-1z`;

const artCache = new Map<string, ArtPaths>();

const thresholdPaths = (
  field: ArtField,
  matrix: DitherMatrix
): { ink: string; cells: (Shade | null)[][] } => {
  const cells = Array.from({ length: ART_ROWS }, (_, y) =>
    Array.from({ length: ART_COLS }, (_unused, x) => field(x, y))
  );
  // A cell next to a lower-numbered part stays clear: a one-cell seam.
  const seam = (x: number, y: number, part: number) =>
    [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ].some(([nx = 0, ny = 0]) => {
      const other = cells[ny]?.[nx] ?? null;
      return other !== null && other[1] < part;
    });
  let ink = "";
  for (let y = 0; y < ART_ROWS; y += 1) {
    for (let x = 0; x < ART_COLS; x += 1) {
      const shade = cells[y]?.[x] ?? null;
      if (
        shade !== null &&
        !seam(x, y, shade[1]) &&
        isInked(matrix, x, y, shade[0])
      ) {
        ink += cellPath(x, y);
      }
    }
  }
  return { cells, ink };
};

const artPaths = (matrix: DitherMatrix): ArtPaths => {
  const cached = artCache.get(matrix);
  if (cached !== undefined) {
    return cached;
  }
  const trayCells = thresholdPaths(tray, matrix);
  const sheetCells = thresholdPaths(sheet, matrix);
  const sheetClear = `M${SHEET.left - 1} ${SHEET.top - 1}h${SHEET.right - SHEET.left + 2}v${SHEET.bottom - SHEET.top + 2}h${-(SHEET.right - SHEET.left + 2)}z`;
  const near = (x: number, y: number) =>
    [-2, -1, 0, 1, 2].some((oy) =>
      [-2, -1, 0, 1, 2].some(
        (ox) =>
          (trayCells.cells[y + oy]?.[x + ox] ?? null) !== null ||
          (x + ox >= SHEET.left - 1 &&
            x + ox <= SHEET.right &&
            y + oy >= SHEET.top - 1 &&
            y + oy <= SHEET.bottom + DROP_CELLS)
      )
    );
  let backdrop = "";
  for (let y = 0; y < ART_ROWS; y += 1) {
    for (let x = 0; x < ART_COLS; x += 1) {
      const halo = Math.hypot((x + 0.5 - ART_X) / 24, (y + 0.5 - 15) / 17);
      const glow = 0.14 * Math.max(0, 1 - halo) ** 2;
      const floor = Math.hypot((x + 0.5 - ART_X) / 21, (y + 0.5 - 33) / 2.3);
      const tone = Math.max(glow, 0.44 * Math.max(0, 1 - floor) ** 0.8);
      if (!near(x, y) && isInked(matrix, x, y, tone)) {
        backdrop += cellPath(x, y);
      }
    }
  }
  const paths = {
    backdrop,
    sheet: sheetCells.ink,
    sheetClear,
    tray: trayCells.ink,
  };
  artCache.set(matrix, paths);
  return paths;
};

/*
 * The sheet hides behind the tray's front face: it shows above the face,
 * a cell clear of it, and down into the notch.
 */
const SHEET_CLIP = `M0 0H${ART_COLS}V${FACE_TOP - 1}H${ART_X + NOTCH.half - 1}V${NOTCH.bottom - 1}H${ART_X - NOTCH.half + 1}V${FACE_TOP - 1}H0Z`;

const STYLES = [
  // One viewBox unit is one cell, so every move is a whole cell.
  "@keyframes dcn-drop-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1px)}}",
  "@keyframes dcn-drop-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-1px)}40%,80%{transform:translateX(1px)}}",
  ".dcn-drop-bob{animation:dcn-drop-bob 3.2s steps(1,end) infinite}",
  ".dcn-drop-lift{transition:transform 260ms steps(4,end)}",
  `.dcn-drop[data-state=active] .dcn-drop-lift{transform:translateY(${DROP_CELLS}px)}`,
  ".dcn-drop[data-state=active] .dcn-drop-bob{animation:none}",
  ".dcn-drop[data-state=reject] .dcn-drop-bob{animation:dcn-drop-shake 0.42s steps(1,end) 2}",
  ".dcn-drop-ink{transition:fill 200ms ease-out}",
  "@media (prefers-reduced-motion:reduce){.dcn-drop-bob,.dcn-drop[data-state=reject] .dcn-drop-bob{animation:none}.dcn-drop-lift,.dcn-drop-ink{transition:none}}",
].join("");

const Illustration = ({
  matrix,
  animate,
  clipId,
}: {
  matrix: DitherMatrix;
  animate: boolean;
  clipId: string;
}) => {
  const paths = artPaths(matrix);
  const ink = { fill: "var(--dcn-drop-ink)" };
  const bob = animate ? "dcn-drop-bob" : undefined;
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${ART_COLS} ${ART_ROWS}`}
      shapeRendering="crispEdges"
      className="pointer-events-none block h-auto w-full"
      style={{ maxWidth: ART_COLS * ART_CELL }}
    >
      <defs>
        <clipPath id={`${clipId}-clip`}>
          <path d={SHEET_CLIP} />
        </clipPath>
        <mask id={`${clipId}-mask`}>
          <rect width={ART_COLS} height={ART_ROWS} fill="white" />
          <g className="dcn-drop-lift">
            <path d={paths.sheetClear} className={bob} fill="black" />
          </g>
        </mask>
      </defs>
      <path
        d={paths.backdrop}
        className="dcn-drop-ink"
        style={{ ...ink, opacity: 0.5 }}
      />
      <path
        d={paths.tray}
        mask={`url(#${clipId}-mask)`}
        className="dcn-drop-ink"
        style={ink}
      />
      <g clipPath={`url(#${clipId}-clip)`}>
        <g className="dcn-drop-lift">
          <path
            d={paths.sheet}
            className={cn("dcn-drop-ink", bob)}
            style={ink}
          />
        </g>
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Dropzone

/** The look of the zone: at rest, with files over it, or turning them away. */
type Visual = "idle" | "active" | "reject";

/** What the zone shows besides its rest state, and for how long. */
type Status =
  | { kind: "idle" }
  | { kind: "over"; files: number }
  | { kind: "over-reject"; files: number; message: string }
  | { kind: "accepted"; files: number }
  | { kind: "rejected"; title: string; message: string };

const IDLE: Status = { kind: "idle" };

const visualOf = (status: Status): Visual => {
  switch (status.kind) {
    case "idle":
    case "accepted": {
      return "idle";
    }
    case "over": {
      return "active";
    }
    case "over-reject":
    case "rejected": {
      return "reject";
    }
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
};

export type DropzoneProps = Omit<
  ComponentProps<"div">,
  "title" | "color" | "children" | "onDrop"
> & {
  /** File types, as the `accept` attribute of a file input: `"image/*,.pdf"`. Default: any. */
  accept?: string;
  /** Largest file in bytes. Default: no limit. */
  maxSize?: number;
  /** Most files per drop or pick. Default: no limit, or 1 when `multiple` is false. */
  maxFiles?: number;
  /** Take more than one file at a time. Default `true`. */
  multiple?: boolean;
  /** Turn the zone off: no picker, no drops, greyed out. Default `false`. */
  disabled?: boolean;
  /** Called after every drop or pick with the accepted and rejected files. */
  onFilesChange?: (files: DropzoneFiles) => void;
  /** The heading. Default `"Drop files here"`, or `"Drop a file here"` for one. */
  title?: ReactNode;
  /** The line under the title. Default: the accepted types, size and count. */
  description?: ReactNode;
  /** Text of the browse button. Default `"Browse files"`. */
  browseLabel?: string;
  /** Shown in place of the illustration, such as a preview of the chosen image. No links or buttons: the zone is a button. */
  preview?: ReactNode;
  /** Name for a hidden file input that holds the accepted files, so a surrounding form submits them. */
  name?: string;
  /** Colour of the border, glow and illustration: a palette name or any CSS colour. Default `"ink"`. */
  color?: DitherColor;
  /** Threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Size of one dither cell in CSS pixels. Default 2. */
  cell?: number;
  /** Corner radius in pixels, followed by the border. Default 16. */
  radius?: number;
  /** A soft glow round the border in its colour. Default `"low"`. */
  bloom?: Bloom;
  /** March the border and bob the illustration. Default `true`; off under reduced motion. */
  animate?: boolean;
  /** Show the drag-over or reject look without a drag, for docs and design reviews. */
  forceState?: "active" | "reject";
};

type Pointer = "none" | "hover" | "focus";

const ENERGY = {
  accepted: 0.34,
  active: 1,
  focus: 0.34,
  hover: 0.22,
  none: 0,
  reject: 0.8,
} as const;

/** How lit the border should be for what the zone shows and where the pointer is. */
const energyFor = (status: Status, pointer: Pointer) => {
  if (status.kind === "accepted") {
    return ENERGY.accepted;
  }
  const visual = visualOf(status);
  return visual === "idle" ? ENERGY[pointer] : ENERGY[visual];
};

const titleFor = (
  status: Status,
  fallback: ReactNode,
  limit: number
): ReactNode => {
  switch (status.kind) {
    case "idle": {
      return fallback;
    }
    case "over": {
      return status.files === 1 || limit === 1
        ? "Release to add the file"
        : `Release to add ${status.files} files`;
    }
    case "over-reject": {
      return status.files === 1
        ? "This file can't be added"
        : "These files can't be added";
    }
    case "accepted": {
      return status.files === 1 ? "File added" : `${status.files} files added`;
    }
    case "rejected": {
      return status.title;
    }
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
};

const hintFor = (status: Status, fallback: ReactNode): ReactNode =>
  status.kind === "over-reject" || status.kind === "rejected"
    ? status.message
    : fallback;

const rejectedTitle = ({ accepted, rejected }: DropzoneFiles) => {
  const [first] = rejected;
  if (rejected.length === 1 && first !== undefined) {
    return accepted.length > 0
      ? `${accepted.length} added, ${first.file.name} skipped`
      : `${first.file.name} wasn't added`;
  }
  return accepted.length > 0
    ? `${accepted.length} added, ${rejected.length} skipped`
    : `${rejected.length} files weren't added`;
};

/** The status a finished drop or pick shows: a rejection until the next drag or pick, an accepted flash for a moment. */
const resultStatus = (result: DropzoneFiles) => {
  if (result.rejected.length > 0) {
    return {
      ms: undefined,
      status: {
        kind: "rejected",
        message: result.rejected[0]?.message ?? "",
        title: rejectedTitle(result),
      } satisfies Status,
    };
  }
  if (result.accepted.length > 0) {
    return {
      ms: ACCEPT_HOLD_MS,
      status: {
        files: result.accepted.length,
        kind: "accepted",
      } satisfies Status,
    };
  }
  return null;
};

const forcedStatus = (
  forceState: DropzoneProps["forceState"],
  rules: Rules
): Status | null => {
  switch (forceState) {
    case undefined: {
      return null;
    }
    case "active": {
      return { files: 2, kind: "over" };
    }
    case "reject": {
      const reason = rules.accept.length > 0 ? "file-type" : "too-many-files";
      return {
        files: 1,
        kind: "over-reject",
        message: rejectMessage(reason, rules),
      };
    }
    default: {
      const exhaustive: never = forceState;
      return exhaustive;
    }
  }
};

const useRules = ({
  accept,
  maxFiles,
  maxSize,
  multiple,
}: {
  accept: string | undefined;
  maxFiles: number | undefined;
  maxSize: number | undefined;
  multiple: boolean;
}) =>
  useMemo<Rules>(
    () => ({
      accept: parseAccept(accept),
      limit: Math.max(1, multiple ? (maxFiles ?? Number.POSITIVE_INFINITY) : 1),
      maxSize,
    }),
    [accept, maxFiles, maxSize, multiple]
  );

interface BorderOptions {
  zoneRef: RefObject<HTMLElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  color: DitherColor;
  matrix: DitherMatrix;
  cell: number;
  radius: number;
  disabled: boolean;
  moving: boolean;
  /** Where the energy and reject values are heading. */
  energy: number;
  reject: number;
}

/**
 * Draw the marching border into the canvas: size it to the zone in whole
 * device pixels per cell, ease the energy towards its target each frame,
 * and redraw on any change while motion is off.
 */
const useBorder = ({
  zoneRef,
  canvasRef,
  color,
  matrix,
  cell,
  radius,
  disabled,
  moving,
  energy,
  reject,
}: BorderOptions) => {
  const frameRef = useRef<ImageData | null>(null);
  const live = useRef<Energy>({ energy: 0, march: 0, reject: 0 });
  const goal = useRef({ energy, reject });
  useEffect(() => {
    goal.current = { energy, reject };
  }, [energy, reject]);
  const [band, setBand] = useState<Band | null>(null);
  // The zone's colour, red for a reject and grey when off.
  const colors = useDitherColors(zoneRef, [color, "red", "grey"]);

  const thresholds = useMemo(
    () =>
      band === null
        ? null
        : Float32Array.from(band.x, (x, i) =>
            thresholdAt(matrix, x, band.y[i] ?? 0)
          ),
    [band, matrix]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!(canvas && band && thresholds && colors)) {
      return;
    }
    const [own, red, grey] = colors;
    paintBorder({
      band,
      canvas,
      frame: frameRef,
      ink: mixColor(disabled ? grey : own, red, live.current.reject),
      live: live.current,
      thresholds,
    });
    const zone = zoneRef.current;
    if (zone instanceof HTMLElement) {
      zone.dataset.ready = "";
    }
  }, [band, thresholds, colors, disabled, canvasRef, zoneRef]);

  useFrameLoop(
    (_time, delta) => {
      const now = live.current;
      const ease = (value: number, target: number) => {
        const tau = target > value ? EASE.rise : EASE.fall;
        return value + (target - value) * (1 - Math.exp(-delta / tau));
      };
      now.energy = ease(now.energy, goal.current.energy);
      now.reject = ease(now.reject, goal.current.reject);
      const speed =
        (MARCH.rest + (MARCH.active - MARCH.rest) * now.energy) *
        (1 - now.reject);
      now.march += disabled ? 0 : delta * speed;
      draw();
    },
    { enabled: moving, target: zoneRef }
  );

  // Still: snap to the targets and redraw whenever the state, size or colours change.
  useEffect(() => {
    if (moving) {
      return;
    }
    live.current.energy = energy;
    live.current.reject = reject;
    draw();
  }, [moving, energy, reject, draw]);

  useEffect(() => {
    const zone = zoneRef.current;
    const canvas = canvasRef.current;
    if (!(zone && canvas)) {
      return;
    }
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const snapped = Math.max(1, Math.round(cell * ratio)) / ratio;
      const box = getComputedStyle(zone);
      const width = Number.parseFloat(box.width) || zone.offsetWidth;
      const height = Number.parseFloat(box.height) || zone.offsetHeight;
      const cols = Math.max(4, Math.floor(width / snapped));
      const rows = Math.max(4, Math.floor(height / snapped));
      // Centre the grid in whole device pixels; the spare sliver is under a cell.
      const left = Math.round(((width - cols * snapped) / 2) * ratio) / ratio;
      const top = Math.round(((height - rows * snapped) / 2) * ratio) / ratio;
      canvas.width = cols;
      canvas.height = rows;
      Object.assign(canvas.style, {
        height: `${rows * snapped}px`,
        left: `${left}px`,
        top: `${top}px`,
        width: `${cols * snapped}px`,
      });
      frameRef.current = null;
      setBand(buildBand(cols, rows, radius / snapped));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(zone);
    return () => observer.disconnect();
  }, [cell, radius, zoneRef, canvasRef]);
};

interface DropTargetOptions {
  rules: Rules;
  disabled: boolean;
  /** The hidden named input that carries the accepted files into a form, when `name` is set. */
  fieldRef: RefObject<HTMLInputElement | null>;
  onFilesChange: ((files: DropzoneFiles) => void) | undefined;
}

/** Drag tracking, sorting, the status line and the live announcement. */
const useDropTarget = ({
  rules,
  disabled,
  fieldRef,
  onFilesChange,
}: DropTargetOptions) => {
  const [status, setStatus] = useState<Status>(IDLE);
  const [message, setMessage] = useState("");
  // Drag events fire on every child; count enters and leaves to know when the drag is gone.
  const depth = useRef(0);
  const timer = useRef(0);
  const speak = useRef(0);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      cancelAnimationFrame(speak.current);
    },
    []
  );

  const show = useCallback((next: Status, ms?: number) => {
    window.clearTimeout(timer.current);
    setStatus(next);
    if (ms !== undefined) {
      timer.current = window.setTimeout(() => setStatus(IDLE), ms);
    }
  }, []);

  const take = useCallback(
    (files: readonly File[]) => {
      const result = sortFiles(files, rules);
      // Empty the live region, then fill it on the next frame, so a result
      // worded the same as the last one is still read out.
      setMessage("");
      cancelAnimationFrame(speak.current);
      speak.current = requestAnimationFrame(() => {
        setMessage(announce(result));
      });
      const field = fieldRef.current;
      if (field) {
        // Keep the accepted files on the named input, so a form posts them.
        const transfer = new DataTransfer();
        for (const file of result.accepted) {
          transfer.items.add(file);
        }
        field.files = transfer.files;
      }
      const held = resultStatus(result);
      show(held?.status ?? IDLE, held?.ms);
      onFilesChange?.(result);
    },
    [fieldRef, onFilesChange, rules, show]
  );

  const carriesFiles = (event: DragEvent) =>
    !disabled && hasFiles(event.dataTransfer);

  const handlers = {
    onDragEnter: (event: DragEvent) => {
      if (!carriesFiles(event)) {
        return;
      }
      event.preventDefault();
      depth.current += 1;
      const verdict = dragVerdict(event.dataTransfer, rules);
      show(
        verdict.reason === null
          ? { files: verdict.files, kind: "over" }
          : {
              files: verdict.files,
              kind: "over-reject",
              message: rejectMessage(verdict.reason, rules),
            }
      );
    },
    onDragLeave: (event: DragEvent) => {
      if (!carriesFiles(event)) {
        return;
      }
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) {
        show(IDLE);
      }
    },
    onDragOver: (event: DragEvent) => {
      if (!carriesFiles(event)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect =
        status.kind === "over-reject" ? "none" : "copy";
    },
    onDrop: (event: DragEvent) => {
      if (!carriesFiles(event)) {
        return;
      }
      event.preventDefault();
      depth.current = 0;
      take([...event.dataTransfer.files]);
    },
  };

  return { handlers, message, status, take };
};

/** The colour and glow for what the zone shows: red for a reject, grey and no glow when off. */
const lookOf = ({
  visual,
  disabled,
  color,
  bloom,
}: {
  visual: Visual;
  disabled: boolean;
  color: DitherColor;
  bloom: Bloom;
}): { ink: DitherColor; glow: Bloom; reject: number } => {
  if (disabled) {
    return { glow: "off", ink: "grey", reject: 0 };
  }
  return visual === "reject"
    ? { glow: bloom, ink: "red", reject: 1 }
    : { glow: bloom, ink: color, reject: 0 };
};

const defaultTitle = ({ limit }: Rules) =>
  limit === 1 ? "Drop a file here" : "Drop files here";

/** Hover and keyboard focus light the border a little. */
const usePointer = () => {
  const [pointer, setPointer] = useState<Pointer>("none");
  const pointerHandlers = {
    onBlur: () => setPointer("none"),
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (event.currentTarget.matches(":focus-visible")) {
        setPointer("focus");
      }
    },
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse") {
        setPointer((now) => (now === "focus" ? now : "hover"));
      }
    },
    onPointerLeave: () => setPointer((now) => (now === "hover" ? "none" : now)),
  };
  return { pointer, pointerHandlers };
};

/** The tint, the fallback edge and the border canvas, under the content. */
const Surface = ({
  canvasRef,
  visual,
  glow,
  tone,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  visual: Visual;
  glow: Bloom;
  tone: DitherColor;
}) => (
  <>
    {/* A faint tint of the colour, a little stronger with files over it. */}
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] transition-[background-color] duration-200 ease-out motion-reduce:transition-none"
      style={{
        backgroundColor: `color-mix(in oklab, var(--dcn-drop-ink) ${visual === "idle" ? 4 : 9}%, transparent)`,
      }}
    />
    {/* Before the first frame, and without script: a plain dashed edge. */}
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] border-2 border-dashed group-data-ready/dropzone:hidden"
      style={{
        borderColor:
          "color-mix(in oklab, var(--dcn-drop-ink) 45%, transparent)",
      }}
    />
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute -z-10 block [image-rendering:pixelated]"
      style={bloomStyle(tone, glow)}
    />
  </>
);

/** Title, hint and the browse button's face. Spans: they sit inside a button. */
const Copy = ({
  id,
  title,
  hint,
  browseLabel,
  tone,
}: {
  id: string;
  title: ReactNode;
  hint: ReactNode;
  browseLabel: string;
  tone: DitherColor;
}) => (
  <>
    <span
      id={`${id}-title`}
      className="mt-4 block max-w-full text-[15px] font-semibold tracking-tight text-balance [overflow-wrap:anywhere]"
    >
      {title}
    </span>
    <span
      id={`${id}-hint`}
      className="text-muted-foreground mt-1 block max-w-xs text-sm text-pretty [overflow-wrap:anywhere]"
    >
      {hint}
    </span>
    <DitherButton
      asChild
      variant="outline"
      size="sm"
      color={tone}
      className="mt-5"
    >
      <span id={`${id}-browse`}>{browseLabel}</span>
    </DitherButton>
  </>
);

/**
 * A file drop area with a dithered dashed border that marches slowly round
 * its edge. Dragging files over it thickens and brightens the border and
 * pulls a dithered glow in from the edges; a drag it would refuse turns
 * red. Click it, or focus it and press Enter or Space, to open the file
 * picker. Every drop or pick is sorted against `accept`, `maxSize` and
 * `maxFiles` and announced to screen readers.
 */
export const Dropzone = ({
  accept,
  maxSize,
  maxFiles,
  multiple = true,
  disabled = false,
  onFilesChange,
  title,
  description,
  browseLabel = "Browse files",
  preview,
  name,
  color = "ink",
  matrix = "bayer4",
  cell = 2,
  radius = 16,
  bloom = "low",
  animate = true,
  forceState,
  className,
  style,
  ...props
}: DropzoneProps) => {
  const id = useId();
  const zoneRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const { pointer, pointerHandlers } = usePointer();
  const reducedMotion = usePrefersReducedMotion();
  const moving = animate && !reducedMotion && !disabled;
  const rules = useRules({ accept, maxFiles, maxSize, multiple });
  const target = useDropTarget({
    disabled,
    fieldRef,
    onFilesChange,
    rules,
  });

  const shown = disabled
    ? IDLE
    : (forcedStatus(forceState, rules) ?? target.status);
  const visual = visualOf(shown);
  const look = lookOf({ bloom, color, disabled, visual });

  useBorder({
    canvasRef,
    cell,
    color,
    disabled,
    energy: disabled ? 0 : energyFor(shown, pointer),
    matrix,
    moving,
    radius,
    reject: look.reject,
    zoneRef,
  });

  const fallbackTitle = title ?? defaultTitle(rules);
  const zoneStyle: CSSProperties & Record<`--${string}`, string> = {
    "--dcn-drop-ink": cssColor(look.ink),
    borderRadius: radius,
  };

  return (
    <div
      data-slot="dropzone"
      className={cn("flex min-h-64 w-full flex-col", className)}
      style={style}
      {...props}
    >
      <style href="dithercn-dropzone" precedence="dithercn">
        {STYLES}
      </style>
      <button
        ref={zoneRef}
        type="button"
        disabled={disabled}
        aria-labelledby={`${id}-title ${id}-browse`}
        aria-describedby={`${id}-hint`}
        data-state={visual}
        className={cn(
          "dcn-drop group/dropzone relative isolate flex flex-1 cursor-pointer flex-col items-center justify-center px-8 py-8 text-center select-none",
          "outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
          "disabled:cursor-not-allowed disabled:opacity-55"
        )}
        style={zoneStyle}
        onClick={() => inputRef.current?.click()}
        {...target.handlers}
        {...pointerHandlers}
      >
        <Surface
          canvasRef={canvasRef}
          visual={visual}
          glow={look.glow}
          tone={look.ink}
        />
        <span className="flex w-full justify-center">
          {preview ?? (
            <Illustration
              matrix={matrix}
              animate={moving && !disabled}
              clipId={id}
            />
          )}
        </span>
        <Copy
          id={id}
          title={titleFor(shown, fallbackTitle, rules.limit)}
          hint={hintFor(shown, description ?? defaultHint(rules))}
          browseLabel={browseLabel}
          tone={look.ink}
        />
      </button>
      {/* The picker: opened by the zone, emptied after every pick so the same file can be picked again. */}
      <input
        ref={inputRef}
        type="file"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        accept={accept}
        multiple={rules.limit > 1}
        disabled={disabled}
        onChange={(event) => {
          const picked = [...(event.currentTarget.files ?? [])];
          event.currentTarget.value = "";
          target.take(picked);
        }}
      />
      {name === undefined ? null : (
        // What a surrounding form submits: the accepted files from the last drop or pick.
        <input
          ref={fieldRef}
          type="file"
          name={name}
          hidden
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
        />
      )}
      <p role="status" className="sr-only">
        {target.message}
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// File list

interface DropzoneFileBase {
  /** Stable key, such as a generated id. */
  id: string;
  name: string;
  /** Size in bytes. */
  size: number;
}

/** A file in the list: uploading (with progress, or null while unknown), done, or failed. */
export type DropzoneFileItem = DropzoneFileBase &
  (
    | { status: "uploading"; progress: number | null }
    | { status: "done" }
    | { status: "error"; message: string }
  );

export type DropzoneFileListProps = Omit<
  ComponentProps<"ul">,
  "children" | "color"
> & {
  files: readonly DropzoneFileItem[];
  /** Called with a file's id when its remove button is pressed. Without it there is no button. */
  onRemove?: (id: string) => void;
  /** Colour of files in progress. Done files are green and failed ones red. Default `"ink"`. */
  color?: DitherColor;
  /** Texture of the progress fill. Default `"gradient"`. */
  fill?: FillVariant;
};

/** A small lit page in dither cells, 9 by 11, with a folded corner. */
const PAGE_GLYPH = (() => {
  let path = "";
  for (let y = 0; y < 11; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const corner = x - 6 > y - 0;
      if (!corner) {
        const fold = x >= 6 && y < 3;
        const tone = fold ? 0.38 : 1 - 0.022 * y - 0.012 * x;
        if (isInked("bayer4", x, y, tone)) {
          path += cellPath(x, y);
        }
      }
    }
  }
  return path;
})();

const FILE_STATE = {
  done: { color: "green", fill: "solid" },
  error: { color: "red", fill: "hatched" },
} as const satisfies Record<
  "done" | "error",
  { color: DitherColor; fill: FillVariant }
>;

const progressOf = (
  file: DropzoneFileItem,
  color: DitherColor,
  fill: FillVariant
) => {
  switch (file.status) {
    case "uploading": {
      const loaded =
        file.progress === null ? null : (file.size * file.progress) / 100;
      return {
        color,
        fill,
        value: file.progress,
        valueText:
          loaded === null
            ? formatBytes(file.size)
            : `${formatBytes(loaded)} of ${formatBytes(file.size)}`,
      };
    }
    case "done": {
      return {
        ...FILE_STATE.done,
        value: 100,
        valueText: formatBytes(file.size),
      };
    }
    case "error": {
      return { ...FILE_STATE.error, value: 100, valueText: file.message };
    }
    default: {
      const exhaustive: never = file;
      return exhaustive;
    }
  }
};

/** A pixel cross, five cells square, for the remove button. */
const CROSS =
  "M0 0h1v1h-1zM4 0h1v1h-1zM1 1h1v1h-1zM3 1h1v1h-1zM2 2h1v1h-1zM1 3h1v1h-1zM3 3h1v1h-1zM0 4h1v1h-1zM4 4h1v1h-1z";

/**
 * The files from a dropzone, each with a dithered progress bar: the zone's
 * colour while uploading, solid green when done, hatched red when it
 * failed. Pair it with `Dropzone` and keep the list in your own state.
 */
export const DropzoneFileList = ({
  files,
  onRemove,
  color = "ink",
  fill = "gradient",
  className,
  ...props
}: DropzoneFileListProps) => (
  <ul
    data-slot="dropzone-files"
    className={cn("flex w-full flex-col gap-4", className)}
    {...props}
  >
    {files.map((file) => {
      const progress = progressOf(file, color, fill);
      return (
        <li
          key={file.id}
          data-status={file.status}
          title={file.name}
          className="flex min-w-0 items-center gap-3"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 9 11"
            shapeRendering="crispEdges"
            className="h-[22px] w-[18px] shrink-0"
          >
            <path d={PAGE_GLYPH} style={{ fill: cssColor(progress.color) }} />
          </svg>
          <ProgressBar
            label={file.name}
            value={progress.value}
            valueText={progress.valueText}
            color={progress.color}
            fill={progress.fill}
            size="sm"
            className="min-w-0 flex-1"
          />
          {onRemove === undefined ? null : (
            <button
              type="button"
              aria-label={`Remove ${file.name}`}
              onClick={() => onRemove(file.id)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-ring -mr-1.5 grid size-7 shrink-0 cursor-pointer place-items-center rounded-md outline-hidden transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-solid motion-reduce:transition-none"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 5 5"
                shapeRendering="crispEdges"
                className="size-2.5 fill-current"
              >
                <path d={CROSS} />
              </svg>
            </button>
          )}
        </li>
      );
    })}
  </ul>
);
