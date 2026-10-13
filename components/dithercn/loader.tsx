"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ComponentProps } from "react";

import {
  bloomStyle,
  isInked,
  useDitherColors,
  useFrameLoop,
} from "@/lib/dither";
import type { Bloom, DitherColor, DitherMatrix, Rgba } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * Every variant is a tone field on a small grid of cells: a function from
 * a cell and the time to a tone between 0 and 1. Each frame the loader
 * thresholds the field with the matrix and paints the inked cells into a
 * canvas one pixel per cell, which CSS scales up without smoothing. Shape
 * edges are hard (a cell is in the ring or not); only the tone inside a
 * shape fades, so outlines stay crisp and the dither carries the motion.
 * Cells are two pixels by default, big enough to read as dither.
 */

export type LoaderVariant = "ring" | "dots" | "pulse" | "bar";
export type LoaderSize = "sm" | "md" | "lg";

export type LoaderProps = Omit<ComponentProps<"div">, "children" | "color"> & {
  /** The animation. Default `"ring"`. */
  variant?: LoaderVariant;
  /** Height in pixels: 24, 40 or 64. Dots are twice as wide, the bar three times. Default `"md"`. */
  size?: LoaderSize;
  /** What a screen reader announces. Default `"Loading"`. */
  label?: string;
  /** A palette name or any CSS colour. Default `"ink"`. */
  color?: DitherColor;
  /** A soft glow in the loader's colour. Default `"off"`. */
  bloom?: Bloom;
  /** Threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Size of one dither cell in CSS pixels. Default 2 (1 at `sm`). */
  cell?: number;
  /** Speed multiplier. Default 1. */
  speed?: number;
};

const HEIGHT = { lg: 64, md: 40, sm: 24 } as const satisfies Record<
  LoaderSize,
  number
>;

const DEFAULT_CELL = { lg: 2, md: 2, sm: 1 } as const satisfies Record<
  LoaderSize,
  number
>;

type ToneField = (x: number, y: number, t: number) => number;

interface Grid {
  cols: number;
  rows: number;
}

const TAU = Math.PI * 2;
/** Tone of the faint track every variant draws its motion on. */
const TRACK = 0.13;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const fract = (value: number) => value - Math.floor(value);
const easeInOut = (value: number) =>
  value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;

/** Distance of a cell centre from the grid centre, 1 at the edge. */
const radiusAt = ({ cols, rows }: Grid, x: number, y: number) =>
  Math.hypot(
    (x + 0.5 - cols / 2) / (cols / 2),
    (y + 0.5 - rows / 2) / (rows / 2)
  );

/**
 * A thick ring with a comet running round it. The head is solid and the
 * tail steps down through the dither levels behind it. The tail stretches
 * and shrinks as it goes, so the ring breathes instead of spinning at one
 * pace, and the whole ring keeps a faint track.
 */
const ringField =
  ({ cols, rows }: Grid): ToneField =>
  (x, y, t) => {
    const dx = (x + 0.5 - cols / 2) / (cols / 2);
    const dy = (y + 0.5 - rows / 2) / (rows / 2);
    const radius = Math.hypot(dx, dy);
    if (radius > 1 || radius < 0.58) {
      return 0;
    }
    const angle = fract(Math.atan2(dx, -dy) / TAU);
    const tail = 0.5 + 0.3 * (0.5 - 0.5 * Math.cos(t * 2.1));
    const behind = fract(t * 0.85 - angle);
    if (behind > tail) {
      return TRACK;
    }
    return Math.max(TRACK, (1 - behind / tail) ** 1.4 * 1.1);
  };

/** Three discs that build up and dissolve through the dither levels in turn. */
const dotsField =
  ({ cols, rows }: Grid): ToneField =>
  (x, y, t) => {
    const pitch = cols / 3;
    const index = Math.min(2, Math.floor(x / pitch));
    const dx = (x + 0.5 - (index + 0.5) * pitch) / (pitch / 2);
    const dy = (y + 0.5 - rows / 2) / (rows / 2);
    if (Math.hypot(dx, dy) > 0.86) {
      return 0;
    }
    const wave = 0.5 + 0.5 * Math.sin(t * TAU * 0.8 - index * 1.1);
    return Math.max(TRACK, wave ** 1.6 * 1.05);
  };

/** A dot that beats while thin rings ripple out of it and fade as they grow. */
const pulseField = ({ cols, rows }: Grid): ToneField => {
  const band = 1.6 / cols;
  return (x, y, t) => {
    const radius = radiusAt({ cols, rows }, x, y);
    if (radius > 1) {
      return 0;
    }
    const beat = 0.5 - 0.5 * Math.cos(t * TAU * 0.6);
    if (radius < 0.18 + 0.08 * beat) {
      return 1;
    }
    let tone = 0;
    for (let ring = 0; ring < 3; ring += 1) {
      const front = 0.25 + 0.75 * fract(t * 0.6 + ring / 3);
      if (Math.abs(radius - front) < band) {
        tone = Math.max(tone, (1 - front) ** 0.6 * 1.3);
      }
    }
    return tone;
  };
};

/** A dense head sweeping across a faint track, its tail thinning behind it. */
const barField =
  ({ cols }: Grid): ToneField =>
  (x, _y, t) => {
    const u = (x + 0.5) / cols;
    // Each pass eases across and runs on past the end, so the tail leaves too.
    const head = 1.45 * easeInOut(fract(t * 0.55));
    const behind = head - u;
    if (behind < 0 || behind > 0.45) {
      return TRACK;
    }
    return Math.max(TRACK, (1 - behind / 0.45) ** 1.1);
  };

const FIELDS = {
  bar: barField,
  dots: dotsField,
  pulse: pulseField,
  ring: ringField,
} as const satisfies Record<LoaderVariant, (grid: Grid) => ToneField>;

// The still frame each variant shows under reduced motion.
const STILL_TIME = {
  bar: 0.9,
  dots: 0.2,
  pulse: 0.5,
  ring: 0.4,
} as const satisfies Record<LoaderVariant, number>;

const gridFor = (variant: LoaderVariant, height: number, cell: number) => {
  const rows = Math.max(6, Math.round(height / cell));
  if (variant === "bar") {
    return { cols: rows * 3, rows: Math.max(2, Math.round(rows / 5)) };
  }
  if (variant === "dots") {
    return { cols: rows * 2, rows: Math.round(rows * 0.62) };
  }
  return { cols: rows, rows };
};

const toByte = (value: number) => Math.round(clamp01(value) * 255);

interface DrawOptions {
  canvas: HTMLCanvasElement | null;
  frame: { current: ImageData | null };
  grid: Grid;
  field: ToneField;
  ink: Rgba;
  matrix: DitherMatrix;
  time: number;
}

const paint = ({
  canvas,
  frame,
  grid,
  field,
  ink,
  matrix,
  time,
}: DrawOptions) => {
  const context = canvas?.getContext("2d");
  if (!context) {
    return;
  }
  const { cols, rows } = grid;
  if (frame.current?.width !== cols || frame.current.height !== rows) {
    frame.current = context.createImageData(cols, rows);
  }
  const { data } = frame.current;
  const [red, green, blue, alpha] = ink.map(toByte);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const offset = (y * cols + x) * 4;
      data[offset] = red ?? 0;
      data[offset + 1] = green ?? 0;
      data[offset + 2] = blue ?? 0;
      data[offset + 3] = isInked(matrix, x, y, field(x, y, time))
        ? (alpha ?? 255)
        : 0;
    }
  }
  context.putImageData(frame.current, 0, 0);
};

/**
 * A small dithered loading indicator: a ring with a comet tail, three
 * dots that dissolve in turn, a pulse, or a bar. It announces `label` politely to
 * screen readers, holds a still frame under reduced motion, and pauses
 * offscreen and in hidden tabs.
 */
export const Loader = ({
  variant = "ring",
  size = "md",
  label = "Loading",
  color = "ink",
  bloom = "off",
  matrix = "bayer4",
  cell,
  speed = 1,
  className,
  ...props
}: LoaderProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<ImageData | null>(null);
  const timeRef = useRef<number>(STILL_TIME[variant]);
  const colors = useDitherColors(rootRef, [color]);
  const ink: Rgba | null = colors ? colors[0] : null;

  const step = Math.max(1, Math.round(cell ?? DEFAULT_CELL[size]));
  const { cols, rows } = gridFor(variant, HEIGHT[size], step);
  const grid = useMemo(() => ({ cols, rows }), [cols, rows]);
  const field = useMemo(() => FIELDS[variant](grid), [variant, grid]);

  const draw = useCallback(
    (time: number) => {
      if (ink) {
        paint({
          canvas: canvasRef.current,
          field,
          frame: frameRef,
          grid,
          ink,
          matrix,
          time,
        });
      }
    },
    [field, grid, ink, matrix]
  );

  // Snap cells to whole device pixels, as the shader does, so every cell is the same size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    const devicePixels = Math.max(1, Math.round(step * ratio));
    canvas.style.width = `${(cols * devicePixels) / ratio}px`;
    canvas.style.height = `${(rows * devicePixels) / ratio}px`;
  }, [step, cols, rows]);

  useFrameLoop(
    (time) => {
      timeRef.current = time * speed + STILL_TIME[variant];
      draw(timeRef.current);
    },
    { stillTime: 0, target: rootRef }
  );

  // Redraw the current frame when the colour or shape changes while still.
  useEffect(() => {
    draw(timeRef.current);
  }, [draw]);

  return (
    <div
      ref={rootRef}
      role="status"
      data-slot="loader"
      data-variant={variant}
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        className
      )}
      {...props}
    >
      <canvas
        ref={canvasRef}
        width={cols}
        height={rows}
        aria-hidden="true"
        className="block [image-rendering:pixelated]"
        style={{
          height: rows * step,
          width: cols * step,
          ...bloomStyle(color, bloom),
        }}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};
