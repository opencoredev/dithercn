"use client";

import { useCallback, useEffect, useRef } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import {
  bloomFilter,
  cssColor,
  ditherMaskStyle,
  getThresholdMap,
  readDitherCell,
  useDitherColors,
  useFrameLoop,
} from "@/lib/dither";
import type {
  Bloom,
  DitherColor,
  DitherMatrix,
  DitherPalette,
  Rgba,
} from "@/lib/dither";
import { cn } from "@/lib/utils";

/**
 * What fills the letters.
 * `gradient`: dense on one side, thinning through dither levels.
 * `noise`: drifting blobs of density.
 * `dotted`, `hatched`: the style kit's textures, drifting slowly.
 * `solid`: flat colour, for bloom alone or to switch the texture off.
 */
export const DITHER_TEXT_FILLS = [
  "gradient",
  "noise",
  "dotted",
  "hatched",
  "solid",
] as const;
export type DitherTextFillName = (typeof DITHER_TEXT_FILLS)[number];

/** A side, or an angle in degrees as in CSS (0 points up, 90 right). */
export type DitherTextDirection = "up" | "down" | "left" | "right" | number;

interface NoiseFill {
  fill: "noise";
  /** Size of the noise blobs: higher values give smaller blobs. Default 3. */
  scale?: number;
}

interface OtherFill {
  /** What fills the letters. Default `"gradient"`. */
  fill?: Exclude<DitherTextFillName, "noise">;
  scale?: never;
}

export type DitherTextFill = NoiseFill | OtherFill;

export type DitherTextTag =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "p"
  | "span"
  | "div"
  | "strong";

export type DitherTextProps = Omit<
  HTMLAttributes<HTMLElement>,
  "children" | "color"
> &
  DitherTextFill & {
    /** The text. It stays real, selectable text. */
    children: ReactNode;
    /** The element to render. Default `"span"`. */
    as?: DitherTextTag;
    /** Ink colour: a palette name or any CSS colour. Default `"ink"`. */
    color?: DitherColor;
    /**
     * Gradient: the way the fill thins out, from its dense side (`"down"`
     * is solid at the top). Noise, dotted and hatched: the way it drifts.
     * Default `"down"`.
     */
    direction?: DitherTextDirection;
    /** Tone at the dense end, 0 (no ink) to 1 (solid). Default 1. */
    from?: number;
    /** Tone at the sparse end. Default 0.4. */
    to?: number;
    /**
     * Opacity of the ink between the dots, 0 to 1, so textured letters keep
     * their shape. Default 0.2 for dotted and hatched, 0 otherwise.
     */
    ghost?: number;
    /** A soft glow in the ink colour. Default `"off"`. */
    bloom?: Bloom;
    /**
     * Colours from the lightest tone to the darkest, for a multi-tone fill.
     * Overrides `color` and `ghost`.
     */
    palette?: DitherPalette;
    /** Threshold matrix for gradient and noise. Default `"bayer4"`. */
    matrix?: DitherMatrix;
    /**
     * Cell size in CSS pixels. Default: about 1/24 of the font size, at
     * least 2, so hero and section sizes both read well.
     */
    cell?: number;
    /** Slowly shift the fill. Default `true`. */
    animate?: boolean;
    /** How fast the fill shifts. Default 1. */
    speed?: number;
  };

// Value noise and fbm on the CPU, matching the shader helpers in spirit.
// The grid is small (one sample per dither cell), so this stays cheap.
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43_758.545_312_3;
  return s - Math.floor(s);
};

const smooth = (t: number) => t * t * (3 - 2 * t);

const valueNoise = (x: number, y: number) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};

const fbm = (x: number, y: number) =>
  valueNoise(x, y) * 0.5333 +
  valueNoise(x * 2.03 + 17.1, y * 2.03 + 9.2) * 0.2667 +
  valueNoise(x * 4.01 + 3.7, y * 4.01 + 31.4) * 0.1333 +
  valueNoise(x * 8.05 + 41.3, y * 8.05 + 5.9) * 0.0667;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const modulo = (value: number, base: number) => ((value % base) + base) % base;

const ANGLES = { down: 180, left: 270, right: 90, up: 0 } as const;

/** Unit vector of a direction, y pointing down the page. */
const vector = (direction: DitherTextDirection) => {
  const degrees = typeof direction === "number" ? direction : ANGLES[direction];
  const radians = (degrees * Math.PI) / 180;
  return { dx: Math.sin(radians), dy: -Math.cos(radians) };
};

// The style kit's textures, cell by cell: the same lattice as
// `fillTile("dotted")` and `fillTile("hatched")`.
const TEXTURES = {
  dotted: (x: number, y: number) =>
    modulo(y, 2) === 0 && modulo(x + y / 2, 2) === 0,
  hatched: (x: number, y: number) => modulo(x + y, 4) === 3,
} as const;

interface FieldOptions {
  fill: DitherTextFillName;
  dx: number;
  dy: number;
  scale: number;
  from: number;
  to: number;
}

/** Tone 0..1 at a cell centre. `u`, `v` are 0..1 across the box, `aspect` w/h. */
const toneAt = (
  { fill, dx, dy, scale, from, to }: FieldOptions,
  u: number,
  v: number,
  aspect: number,
  time: number
) => {
  const px = (u - 0.5) * aspect;
  const py = v - 0.5;
  if (fill === "noise") {
    const n = fbm(px * scale - time * 0.09 * dx, py * scale - time * 0.09 * dy);
    return from + (to - from) * clamp01((n - 0.22) / 0.56);
  }
  // Gradient: position along the direction, 0 at the dense side.
  const extent = Math.abs(dx) * aspect * 0.5 + Math.abs(dy) * 0.5;
  const drift = fbm(px * 1.6 + time * 0.07, py * 1.6 - time * 0.04) - 0.5;
  const s = clamp01((px * dx + py * dy) / (2 * extent) + 0.5 + drift * 0.28);
  return from + (to - from) * s;
};

const toByte = (value: number) => Math.round(value * 255);

interface Paint {
  /** Colours from paper to ink. */
  colors: readonly Rgba[];
  /** The colour of uninked cells in a texture. */
  gap: Rgba;
}

interface Grid {
  /** Cells across and down the canvas, margins included. */
  cols: number;
  rows: number;
  /** Cells of margin around the element's box, for overhanging glyphs. */
  margin: number;
  /** Cells across and down the element's box. */
  boxCols: number;
  boxRows: number;
  aspect: number;
  time: number;
  /** How much of each cell the glyphs cover, 0 to 1. */
  coverage: Float32Array;
}

// A cell this covered is inside the letter; this bare, outside. Between the
// two, the glyph's edge dithers on the grid instead of cutting a cell.
const COVERED = 0.62;
const BARE = 0.3;

/** Fill `data` (RGBA bytes, `cols` × `rows`) with the dithered letters. */
const paintCells = (
  data: Uint8ClampedArray,
  { cols, rows, margin, boxCols, boxRows, aspect, time, coverage }: Grid,
  field: FieldOptions,
  { colors, gap }: Paint,
  matrix: DitherMatrix
) => {
  const { size: tile, thresholds } = getThresholdMap(matrix);
  const segments = colors.length - 1;
  const ink = colors.at(-1) ?? [0, 0, 0, 1];
  const texture =
    field.fill === "dotted" || field.fill === "hatched"
      ? TEXTURES[field.fill]
      : null;
  // Textures drift a cell at a time, about two cells a second.
  const ox = Math.round(-field.dx * time * 2);
  const oy = Math.round(-field.dy * time * 2);
  data.fill(0);
  for (let y = 0; y < rows; y += 1) {
    const v = (y - margin + 0.5) / boxRows;
    for (let x = 0; x < cols; x += 1) {
      const cell = y * cols + x;
      const covered = coverage[cell] ?? 0;
      if (covered <= BARE) {
        continue;
      }
      // Offset into the matrix so the edge and the fill don't share dots.
      const edge =
        thresholds[((y + 1) % tile) * tile + ((x + 2) % tile)] ?? 0.5;
      if (covered < COVERED && (covered - BARE) / (COVERED - BARE) <= edge) {
        continue;
      }
      let pick: Rgba | undefined = ink;
      if (texture) {
        pick = texture(x + ox, y + oy) ? ink : gap;
      } else if (field.fill !== "solid") {
        const u = (x - margin + 0.5) / boxCols;
        const tone = toneAt(field, u, v, aspect, time);
        const scaled = clamp01(tone) * segments;
        const low = Math.min(segments - 1, Math.floor(scaled));
        const threshold = thresholds[(y % tile) * tile + (x % tile)] ?? 0.5;
        pick = scaled - low > threshold ? colors[low + 1] : colors[low];
      }
      const [r, g, b, alpha] = pick ?? [0, 0, 0, 0];
      const offset = cell * 4;
      data[offset] = toByte(r);
      data[offset + 1] = toByte(g);
      data[offset + 2] = toByte(b);
      data[offset + 3] = toByte(alpha);
    }
  }
};

// Glyphs are drawn this many samples across each cell to measure coverage.
const SUPERSAMPLE = 4;

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

const graphemes = (text: string) =>
  segmenter
    ? Array.from(segmenter.segment(text), (part) => ({
        index: part.index,
        value: part.segment,
      }))
    : Array.from(text, (value, index) => ({ index, value }));

const TRANSFORMS: Record<string, (text: string) => string> = {
  lowercase: (text) => text.toLocaleLowerCase(),
  uppercase: (text) => text.toLocaleUpperCase(),
};

/** The CSS `font` shorthand for an element, built from longhands for Firefox. */
const fontOf = (style: CSSStyleDeclaration) =>
  style.font ||
  `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

interface GlyphMap {
  cols: number;
  rows: number;
  margin: number;
  boxCols: number;
  boxRows: number;
  coverage: Float32Array;
}

/**
 * Draws every glyph of `el` where the browser laid it out, onto a canvas
 * `SUPERSAMPLE` samples per cell, and measures how much of each cell the
 * letters cover. Each glyph is drawn at its own range rect, so wrapping,
 * kerning, letter spacing and alignment all come from the page.
 */
const measureGlyphs = (
  el: HTMLElement,
  cell: number,
  scratch: HTMLCanvasElement
): GlyphMap | null => {
  const width = el.offsetWidth;
  const height = el.offsetHeight;
  const box = el.getBoundingClientRect();
  if (width === 0 || height === 0 || box.width === 0) {
    return null;
  }
  // Undo any transform on the element (an entrance scale, say).
  const scale = box.width / width;
  const fontSize = Number.parseFloat(getComputedStyle(el).fontSize) || 16;
  const margin = Math.ceil((fontSize * 0.3) / cell);
  const boxCols = Math.ceil(width / cell);
  const boxRows = Math.ceil(height / cell);
  const cols = boxCols + margin * 2;
  const rows = boxRows + margin * 2;
  scratch.width = cols * SUPERSAMPLE;
  scratch.height = rows * SUPERSAMPLE;
  const context = scratch.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }
  const unit = SUPERSAMPLE / cell;
  context.setTransform(
    unit,
    0,
    0,
    unit,
    margin * SUPERSAMPLE,
    margin * SUPERSAMPLE
  );
  context.fillStyle = "#fff";
  context.textBaseline = "alphabetic";
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    const text = node.textContent ?? "";
    if (!parent || !text.trim()) {
      continue;
    }
    const style = getComputedStyle(parent);
    context.font = fontOf(style);
    const transform = TRANSFORMS[style.textTransform];
    for (const { index, value } of graphemes(text)) {
      if (!value.trim()) {
        continue;
      }
      range.setStart(node, index);
      range.setEnd(node, index + value.length);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        continue;
      }
      const glyph = transform ? transform(value) : value;
      const metrics = context.measureText(glyph);
      const ascent = metrics.fontBoundingBoxAscent;
      const descent = metrics.fontBoundingBoxDescent;
      const top = (rect.top - box.top) / scale;
      const lineHeight = rect.height / scale;
      const baseline = top + (lineHeight - ascent - descent) / 2 + ascent;
      context.fillText(glyph, (rect.left - box.left) / scale, baseline);
    }
  }
  const { data } = context.getImageData(0, 0, scratch.width, scratch.height);
  const coverage = new Float32Array(cols * rows);
  const samples = SUPERSAMPLE * SUPERSAMPLE * 255;
  const stride = scratch.width;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      let sum = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        const rowStart =
          ((y * SUPERSAMPLE + sy) * stride + x * SUPERSAMPLE) * 4;
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          sum += data[rowStart + sx * 4 + 3] ?? 0;
        }
      }
      coverage[y * cols + x] = sum / samples;
    }
  }
  return { boxCols, boxRows, cols, coverage, margin, rows };
};

/** The fill, noise scale and gap opacity a set of props resolves to. */
const fillSettings = (props: DitherTextFill & { ghost?: number }) => {
  const fill = props.fill ?? "gradient";
  const textured = fill === "dotted" || fill === "hatched";
  return {
    fill,
    gapOpacity: props.ghost ?? (textured ? 0.2 : 0),
    scale: props.fill === "noise" ? (props.scale ?? 3) : 1,
  };
};

/**
 * Display text whose letters are drawn as a dither: a gradient, noise,
 * dots or hatching in any palette colour. The text stays a real element
 * (selectable, read by screen readers, indexed) and turns transparent; a
 * canvas over it draws the letters as whole dither cells, so their edges
 * step along the grid like the rest of the engine instead of cutting cells.
 */
export const DitherText = (props: DitherTextProps) => {
  const {
    as: Tag = "span",
    children,
    color = "ink",
    direction = "down",
    from = 1,
    to = 0.4,
    ghost: _ghost,
    bloom = "off",
    palette,
    matrix = "bayer4",
    cell,
    animate = true,
    speed = 1,
    fill: _fill,
    scale: _scale,
    className,
    style,
    ...rest
  } = props;
  const { fill, scale, gapOpacity } = fillSettings(props);
  const { dx, dy } = vector(direction);
  const custom = palette !== undefined;

  const ref = useRef<HTMLElement>(null);
  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const glyphsRef = useRef<GlyphMap | null>(null);
  const cellRef = useRef(3);
  const timeRef = useRef(0);
  const resolved = useDitherColors(
    ref,
    palette ?? (["transparent", color] as const)
  );

  // Paint one frame of the fill into the letters' cells.
  const draw = useCallback(
    (time: number) => {
      const el = ref.current;
      const canvas = canvasRef.current;
      const glyphs = glyphsRef.current;
      if (!el || !canvas || !glyphs || !resolved) {
        return;
      }
      const size = cellRef.current;
      const { cols, rows, margin } = glyphs;
      if (canvas.width !== cols || canvas.height !== rows) {
        canvas.width = cols;
        canvas.height = rows;
        canvas.style.width = `${cols * size}px`;
        canvas.style.height = `${rows * size}px`;
        canvas.style.left = `${-margin * size}px`;
        canvas.style.top = `${-margin * size}px`;
      }
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }
      const colors: Rgba[] = [...resolved];
      const [r, g, b, a] = colors.at(-1) ?? [0, 0, 0, 1];
      const gap: Rgba = [r, g, b, a * gapOpacity];
      if (!custom) {
        colors[0] = gap;
      }
      const image = context.createImageData(cols, rows);
      paintCells(
        image.data,
        {
          ...glyphs,
          aspect: glyphs.boxCols / glyphs.boxRows || 1,
          time,
        },
        { dx, dy, fill, from, scale, to },
        { colors, gap: custom ? (colors[0] ?? gap) : gap },
        matrix
      );
      context.putImageData(image, 0, 0);
      el.dataset.state = "ready";
    },
    [custom, dx, dy, fill, from, gapOpacity, matrix, resolved, scale, to]
  );

  useFrameLoop(
    (time) => {
      timeRef.current = time * speed;
      draw(timeRef.current);
    },
    { enabled: animate && fill !== "solid", fps: 12, target: ref }
  );

  // Re-measure the glyphs when the box, the text or a web font changes;
  // the fill then redraws at the last time.
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const fontSize = Number.parseFloat(getComputedStyle(el).fontSize);
        const auto = Math.max(2, Math.round(fontSize / 24));
        cellRef.current =
          cell ?? (Number.isFinite(auto) ? auto : readDitherCell(el));
        scratchRef.current ??= document.createElement("canvas");
        glyphsRef.current = measureGlyphs(
          el,
          cellRef.current,
          scratchRef.current
        );
        draw(timeRef.current);
      });
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    const content = new MutationObserver(measure);
    content.observe(el, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    document.fonts?.addEventListener("loadingdone", measure);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      content.disconnect();
      document.fonts?.removeEventListener("loadingdone", measure);
    };
  }, [cell, draw]);

  const ink = palette?.at(-1) ?? color;
  const rootStyle: CSSProperties & Record<"--dither-text-ink", string> = {
    "--dither-text-ink": cssColor(ink),
    filter: bloomFilter(ink, bloom),
    // Until the canvas has drawn, a CSS mask at the average tone.
    ...(resolved || fill === "solid"
      ? {}
      : ditherMaskStyle((from + to) / 2, { matrix })),
    ...style,
  };

  return (
    <Tag
      {...rest}
      ref={setRef}
      data-state="fallback"
      className={cn(
        "group/dither-text relative inline-block text-(--dither-text-ink)",
        "data-[state=ready]:text-transparent",
        "forced-colors:text-[CanvasText]",
        className
      )}
      style={rootStyle}
    >
      {children}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute hidden [image-rendering:pixelated] group-data-[state=ready]/dither-text:block forced-colors:hidden!"
      />
    </Tag>
  );
};
