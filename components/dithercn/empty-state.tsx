import type { ComponentProps, ReactNode } from "react";

import { cssColor, isInked } from "@/lib/dither";
import type { DitherColor, DitherMatrix } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * Each illustration is a small lit object, drawn as a tone field on a grid
 * of cells: every surface gets a tone from a light up and to the left, so
 * faces facing the light are dense and faces turned away are sparse, and
 * curved surfaces fall off through every Bayer level. The field is
 * thresholded once into an SVG path per layer and cached. A one-cell seam
 * splits the object's parts (faces, rim, handle), and cells within two
 * of the object are kept clear, which gives it a crisp outline against
 * the halo behind it. The halo is a faint radial fade and a
 * dithered floor shadow. With `animate`, the object bobs a cell up and
 * down in whole-cell steps while the shadow tightens under it.
 */

const COLS = 112;
const ROWS = 72;
const CX = COLS / 2;
const CY = 32;

export type EmptyStateIllustration = "box" | "search" | "folder" | "planet";

type Point = readonly [number, number];

/** Tone and part number of the object at a cell, or null where there is none. */
type Shade = readonly [tone: number, part: number];
type ObjectField = (x: number, y: number) => Shade | null;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Whether a point is inside a convex or simple polygon (even-odd rule). */
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

const shift = ([x, y]: Point, dx: number, dy: number): Point => [
  x + dx,
  y + dy,
];

/** Shade a flat face: its base tone, lighter towards its top. */
const face = (tone: number, y: number, top: number, height: number) =>
  clamp01(tone * (1.15 - (0.35 * (y - top)) / height));

/** An open box, flaps folded back, seen from above and to the front. */
const box: ObjectField = (x, y) => {
  const top: Point = [CX, CY - 14];
  const left: Point = [CX - 26, CY - 1];
  const right: Point = [CX + 26, CY - 1];
  const front: Point = [CX, CY + 12];
  const depth = 20;
  const lift = 11;
  const flaps: readonly (readonly [readonly Point[], number])[] = [
    [[top, left, shift(left, -9, -lift), shift(top, -9, -lift)], 0.72],
    [[top, right, shift(right, 9, -lift), shift(top, 9, -lift)], 0.42],
  ];
  for (const [index, [points, tone]] of flaps.entries()) {
    if (inPolygon(x, y, points)) {
      return [face(tone, y, CY - 14 - lift, lift + 14), index];
    }
  }
  const leftFace = [left, front, shift(front, 0, depth), shift(left, 0, depth)];
  if (inPolygon(x, y, leftFace)) {
    return [face(0.62, y, CY - 1, depth + 13), 2];
  }
  const rightFace = [
    front,
    right,
    shift(right, 0, depth),
    shift(front, 0, depth),
  ];
  if (inPolygon(x, y, rightFace)) {
    return [face(0.3, y, CY - 1, depth + 13), 3];
  }
  const opening = [top, right, front, left];
  const inner = opening.map(
    ([px, py]): Point => [CX + (px - CX) * 0.8, CY - 1 + (py - (CY - 1)) * 0.74]
  );
  if (inPolygon(x, y, opening) && !inPolygon(x, y, inner)) {
    // The lip of the opening catches the light.
    return [0.9, 5];
  }
  if (inPolygon(x, y, opening)) {
    // The far walls catch light; the floor of the box is in shadow.
    const near = (y - (CY - 14)) / 26;
    return [0.06 + 0.32 * (1 - near) ** 2, 4];
  }
  return null;
};

/** Distance from a point to a segment. */
const toSegment = (x: number, y: number, a: Point, b: Point) => {
  const [ax, ay] = a;
  const [bx, by] = b;
  const length = (bx - ax) ** 2 + (by - ay) ** 2;
  const t = clamp01(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / length);
  return Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay)));
};

/** A magnifying glass: a lit rim, a glint on the glass, a round handle. */
const search: ObjectField = (x, y) => {
  const lens: Point = [CX - 7, CY - 4];
  const dx = x - lens[0];
  const dy = y - lens[1];
  const radius = Math.hypot(dx, dy);
  if (radius < 21 && radius > 15.5) {
    // Brightest where the rim faces the light, up and to the left.
    const facing = (-dx * 0.7 - dy * 0.7) / radius;
    return [clamp01(0.55 + 0.42 * facing), 0];
  }
  if (radius <= 15.5) {
    const glint = Math.hypot(dx + 6, (dy + 6) * 1.6);
    return [glint < 4.5 ? 0.85 : 0.05 * (1 - radius / 15.5), 1];
  }
  const start: Point = [lens[0] + 16, lens[1] + 16];
  const end: Point = [lens[0] + 31, lens[1] + 31];
  const distance = toSegment(x, y, start, end);
  if (distance < 4.6) {
    // Across the handle: lit on its upper side, rolling into shadow.
    const side = (x - y - (start[0] - start[1])) / 6.5;
    return [clamp01(0.5 - 0.42 * side + 0.15 * (1 - distance / 4.6)), 2];
  }
  return null;
};

const inRect = (
  x: number,
  y: number,
  [left, top]: Point,
  [width, height]: Point
) => x >= left && x < left + width && y >= top && y < top + height;

/** A folder with a sheet of paper peeking out of it. */
const folder: ObjectField = (x, y) => {
  const left = CX - 30;
  const top = CY - 12;
  // The front panel leans back: its top edge is pulled in by a few cells.
  const frontTop = top + 9;
  const lean = (frontTop + 26 - y) / 26;
  if (y >= frontTop && y < frontTop + 26) {
    const inset = Math.round(6 * lean);
    if (x >= left - 2 + inset && x < left + 62 - inset) {
      return [face(0.6, y, frontTop, 26), 0];
    }
  }
  if (inRect(x, y, [left + 14, top - 4], [34, 16])) {
    // The sheet: bright, with two lines of text knocked out.
    const line = y === top - 1 || y === top + 3;
    return [line && x > left + 18 && x < left + 42 ? 0.15 : 0.95, 1];
  }
  if (
    inRect(x, y, [left, top], [60, 12]) ||
    inRect(x, y, [left, top - 6], [20, 7])
  ) {
    return [face(0.42, y, top - 6, 18), 2];
  }
  return null;
};

/** A lit sphere with a tilted ring round it, and a few stars. */
const planet: ObjectField = (x, y) => {
  const px = x + 0.5 - CX;
  const py = y + 0.5 - (CY + 2);
  const r = 17;
  const ringX = px * 0.94 + py * 0.34;
  const ringY = -px * 0.34 + py * 0.94;
  const ring = Math.hypot(ringX / 33, ringY / 8.5);
  const onRing = ring > 0.82 && ring < 1;
  const front = ringY > 0;
  const sphere = Math.hypot(px, py) < r;
  if (onRing && (front || !sphere)) {
    return [0.42 + 0.4 * (1 - (ringX + 33) / 66), 0];
  }
  if (sphere) {
    const nx = px / r;
    const ny = py / r;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const light = -0.55 * nx - 0.6 * ny + 0.58 * nz;
    return [clamp01(0.04 + 0.98 * Math.max(0, light) ** 1.2), 1];
  }
  return null;
};

const OBJECTS = {
  box,
  folder,
  planet,
  search,
} as const satisfies Record<EmptyStateIllustration, ObjectField>;

/** Floor shadow and halo tone behind the object. */
const backdrop = (
  illustration: EmptyStateIllustration,
  x: number,
  y: number
) => {
  const halo = Math.hypot((x + 0.5 - CX) / 54, (y + 0.5 - CY) / 34);
  const glow = 0.12 * Math.max(0, 1 - halo) ** 2;
  if (illustration === "planet") {
    return glow;
  }
  const floor = Math.hypot((x + 0.5 - CX) / 36, (y + 0.5 - 67) / 3.6);
  return Math.max(glow, 0.42 * Math.max(0, 1 - floor) ** 0.8);
};

const cell = (x: number, y: number) => `M${x} ${y}h1v1h-1z`;

interface ScenePaths {
  object: string;
  backdrop: string;
}

const sceneCache = new Map<string, ScenePaths>();

const scenePaths = (
  illustration: EmptyStateIllustration,
  matrix: DitherMatrix
): ScenePaths => {
  const key = `${illustration}:${matrix}`;
  const cached = sceneCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const field = OBJECTS[illustration];
  const tones = Array.from({ length: ROWS }, (_, y) =>
    Array.from({ length: COLS }, (_unused, x) => field(x, y))
  );
  const near = (x: number, y: number) =>
    [-2, -1, 0, 1, 2].some((oy) =>
      [-2, -1, 0, 1, 2].some((ox) => (tones[y + oy]?.[x + ox] ?? null) !== null)
    );
  // A cell next to a lower-numbered part is left clear, so parts are split
  // by a one-cell seam, as in pixel art.
  const seam = (x: number, y: number, part: number) =>
    [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ].some(([nx = 0, ny = 0]) => {
      const other = tones[ny]?.[nx] ?? null;
      return other !== null && other[1] < part;
    });
  let object = "";
  let back = "";
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const shade = tones[y]?.[x] ?? null;
      if (shade !== null) {
        const [tone, part] = shade;
        if (!seam(x, y, part) && isInked(matrix, x, y, tone)) {
          object += cell(x, y);
        }
      } else if (
        !near(x, y) &&
        isInked(matrix, x, y, backdrop(illustration, x, y))
      ) {
        back += cell(x, y);
      }
    }
  }
  const paths = { backdrop: back, object };
  sceneCache.set(key, paths);
  return paths;
};

const STYLES = [
  "@keyframes dcn-empty-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1px)}}",
  ".dcn-empty-bob{animation:dcn-empty-bob 3.2s steps(1,end) infinite}",
  "@keyframes dcn-empty-shadow{0%,100%{opacity:1}50%{opacity:0.7}}",
  ".dcn-empty-shadow{animation:dcn-empty-shadow 3.2s steps(1,end) infinite}",
  "@media (prefers-reduced-motion: reduce){.dcn-empty-bob,.dcn-empty-shadow{animation:none}}",
].join("");

interface SceneProps {
  illustration: EmptyStateIllustration;
  matrix: DitherMatrix;
  color: DitherColor;
  animate: boolean;
}

const Scene = ({ illustration, matrix, color, animate }: SceneProps) => {
  const paths = scenePaths(illustration, matrix);
  const ink = cssColor(color);
  return (
    <>
      <style href="dithercn-empty-state" precedence="dithercn">
        {STYLES}
      </style>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${COLS} ${ROWS}`}
        shapeRendering="crispEdges"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 size-full"
      >
        <path
          d={paths.backdrop}
          className={animate ? "dcn-empty-shadow" : undefined}
          style={{ fill: ink, opacity: 0.55 }}
        />
        {/* One viewBox unit is one cell, so the bob moves a whole cell. */}
        <path
          d={paths.object}
          className={animate ? "dcn-empty-bob" : undefined}
          style={{ fill: ink }}
        />
      </svg>
    </>
  );
};

export type EmptyStateProps = Omit<ComponentProps<"div">, "title" | "color"> & {
  /** The heading. Say what is empty, plainly. */
  title: ReactNode;
  /** One or two sentences: why it is empty and what to do next. */
  description?: ReactNode;
  /** Buttons or links, under the text. */
  action?: ReactNode;
  /** The dithered object above the text: an open box, a magnifier, a folder or a ringed planet. Default `"box"`. */
  illustration?: EmptyStateIllustration;
  /** Colour of the illustration: a palette name or any CSS colour. Default `"ink"`. */
  color?: DitherColor;
  /** Threshold matrix: `bayer4` for crisp steps, `bayer8` for finer ones, `blue-noise` for grain. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Bob the object up and down a cell. Default `true`. */
  animate?: boolean;
  /** Heading level. Default `"h3"`. */
  titleAs?: "h2" | "h3" | "h4";
};

/**
 * A placeholder for a view with nothing in it yet: a lit, dithered
 * illustration, a title, a short description and an action.
 */
export const EmptyState = ({
  title,
  description,
  action,
  illustration = "box",
  color = "ink",
  matrix = "bayer4",
  animate = true,
  titleAs: Heading = "h3",
  className,
  ...props
}: EmptyStateProps) => (
  <div
    data-slot="empty-state"
    data-illustration={illustration}
    className={cn(
      "flex flex-col items-center px-6 py-10 text-center",
      className
    )}
    {...props}
  >
    <div className="relative aspect-[112/72] w-full max-w-[336px]">
      <Scene
        illustration={illustration}
        matrix={matrix}
        color={color}
        animate={animate}
      />
    </div>
    <div className="mt-3 flex max-w-sm flex-col gap-1.5">
      <Heading className="text-base font-semibold tracking-tight text-balance">
        {title}
      </Heading>
      {description === undefined ? null : (
        <p className="text-muted-foreground text-sm text-pretty">
          {description}
        </p>
      )}
    </div>
    {action === undefined ? null : (
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {action}
      </div>
    )}
  </div>
);
