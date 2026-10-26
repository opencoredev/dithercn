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
  cols: number;
  rows: number;
  aspect: number;
  time: number;
}

/** Fill `data` (RGBA bytes, `cols` × `rows`) with the dithered field. */
const paintCells = (
  data: Uint8ClampedArray,
  { cols, rows, aspect, time }: Grid,
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
  for (let y = 0; y < rows; y += 1) {
    const v = (y + 0.5) / rows;
    for (let x = 0; x < cols; x += 1) {
      let pick: Rgba | undefined = ink;
      if (texture) {
        pick = texture(x + ox, y + oy) ? ink : gap;
      } else if (field.fill !== "solid") {
        const tone = toneAt(field, (x + 0.5) / cols, v, aspect, time);
        const scaled = clamp01(tone) * segments;
        const low = Math.min(segments - 1, Math.floor(scaled));
        const threshold = thresholds[(y % tile) * tile + (x % tile)] ?? 0.5;
        pick = scaled - low > threshold ? colors[low + 1] : colors[low];
      }
      const [r, g, b, alpha] = pick ?? [0, 0, 0, 0];
      const offset = (y * cols + x) * 4;
      data[offset] = toByte(r);
      data[offset + 1] = toByte(g);
      data[offset + 2] = toByte(b);
      data[offset + 3] = toByte(alpha);
    }
  }
};

interface Frame {
  el: HTMLElement;
  /** CSS `background-size` for the frame. */
  size: string;
  url: string;
}

interface Swapper {
  /** A frame is decoding. */
  busy: boolean;
  /** The newest frame waiting to decode; older waiting frames are dropped. */
  queued: Frame | null;
  /** The frame on screen. Holding it keeps it in Safari's memory cache. */
  shown: HTMLImageElement | null;
}

/**
 * Swap queued frames into the background one at a time, each only once it
 * has decoded. Safari loads a new background image asynchronously and paints
 * a frame without it, which blinks the (transparent) text out. One decode at
 * a time, plus the newest waiting frame, keeps a slow device from piling up.
 */
const showQueued = async (swapper: Swapper) => {
  const frame = swapper.queued;
  if (!frame) {
    swapper.busy = false;
    return;
  }
  swapper.busy = true;
  swapper.queued = null;
  const image = new Image();
  image.src = frame.url;
  try {
    await image.decode();
  } catch {
    // Swap anyway: a frame that will not decode beats a frozen fill.
  }
  swapper.shown = image;
  frame.el.style.backgroundImage = `url(${frame.url})`;
  frame.el.style.backgroundSize = frame.size;
  frame.el.dataset.state = "ready";
  // Not awaited: this call finishes once it has handed off, so a long run
  // of slow decodes doesn't build a chain of pending promises.
  showQueued(swapper);
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
 * Display text whose letters are filled with a dither: a gradient, noise,
 * dots or hatching in any palette colour. The text stays a real element
 * (selectable, read by screen readers, indexed); the dither is a small
 * generated image clipped to the glyphs with `background-clip: text`.
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef({ cell: 3, height: 0, width: 0 });
  const timeRef = useRef(0);
  const swapperRef = useRef<Swapper>({
    busy: false,
    queued: null,
    shown: null,
  });
  const resolved = useDitherColors(
    ref,
    palette ?? (["transparent", color] as const)
  );

  // Paint one frame into a cell-sized canvas and set it as the background.
  const draw = useCallback(
    (time: number) => {
      const el = ref.current;
      const { width, height, cell: size } = sizeRef.current;
      if (!el || !resolved || width === 0 || height === 0) {
        return;
      }
      const cols = Math.ceil(width / size);
      const rows = Math.ceil(height / size);
      canvasRef.current ??= document.createElement("canvas");
      const canvas = canvasRef.current;
      if (canvas.width !== cols || canvas.height !== rows) {
        canvas.width = cols;
        canvas.height = rows;
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
        { aspect: width / height, cols, rows, time },
        { dx, dy, fill, from, scale, to },
        { colors, gap: custom ? (colors[0] ?? gap) : gap },
        matrix
      );
      context.putImageData(image, 0, 0);
      const swapper = swapperRef.current;
      swapper.queued = {
        el,
        size: `${cols * size}px ${rows * size}px`,
        url: canvas.toDataURL(),
      };
      if (!swapper.busy) {
        showQueued(swapper);
      }
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

  // Track the box and font size; redraw at the last time on any change.
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const measure = () => {
      const fontSize = Number.parseFloat(getComputedStyle(el).fontSize);
      const auto = Math.max(2, Math.round(fontSize / 24));
      sizeRef.current = {
        cell: cell ?? (Number.isFinite(auto) ? auto : readDitherCell(el)),
        height: el.offsetHeight,
        width: el.offsetWidth,
      };
      draw(timeRef.current);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [cell, draw]);

  const ink = palette?.at(-1) ?? color;
  const rootStyle: CSSProperties & Record<"--dither-text-ink", string> = {
    "--dither-text-ink": cssColor(ink),
    filter: bloomFilter(ink, bloom),
    // Until the dither is painted, a CSS mask at the average tone.
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
        "inline-block bg-no-repeat text-(--dither-text-ink) [image-rendering:pixelated]",
        "data-[state=ready]:bg-clip-text data-[state=ready]:text-transparent",
        "forced-colors:bg-none forced-colors:text-[CanvasText]",
        className
      )}
      style={rootStyle}
    >
      {children}
    </Tag>
  );
};
