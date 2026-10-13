"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ComponentProps } from "react";

import { isInked, useDitherColors, useFrameLoop } from "@/lib/dither";
import type { DitherColor, DitherMatrix, Rgba } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * Every variant is a tone field on a small grid of cells: a function from
 * a cell and the time to a tone between 0 and 1. Each frame the loader
 * thresholds the field with the matrix and paints the inked cells into a
 * canvas one pixel per cell, which CSS scales up without smoothing. A
 * 32px loader is 256 cells, so a frame costs next to nothing.
 */

export type LoaderVariant = "ring" | "dots" | "bar" | "square";
export type LoaderSize = "sm" | "md" | "lg";

export type LoaderProps = Omit<ComponentProps<"div">, "children" | "color"> & {
  /** The animation. Default `"ring"`. */
  variant?: LoaderVariant;
  /** Height in pixels: 20, 32 or 48. The bar is three times as wide. Default `"md"`. */
  size?: LoaderSize;
  /** What a screen reader announces. Default `"Loading"`. */
  label?: string;
  /** Ink colour. Default `--dither-ink`. */
  color?: DitherColor;
  /** Threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Size of one dither cell in CSS pixels. Default 2. */
  cell?: number;
  /** Speed multiplier. Default 1. */
  speed?: number;
};

const HEIGHT = { lg: 48, md: 32, sm: 20 } as const satisfies Record<
  LoaderSize,
  number
>;

type ToneField = (x: number, y: number, t: number) => number;

interface Grid {
  cols: number;
  rows: number;
}

const TAU = Math.PI * 2;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const k = clamp01((value - edge0) / (edge1 - edge0));
  return k * k * (3 - 2 * k);
};
const fract = (value: number) => value - Math.floor(value);

/** A comet running round a ring, its tail fading through the levels. */
const ringField =
  ({ cols, rows }: Grid): ToneField =>
  (x, y, t) => {
    const dx = (x + 0.5 - cols / 2) / (cols / 2);
    const dy = (y + 0.5 - rows / 2) / (rows / 2);
    const radius = Math.hypot(dx, dy);
    const band =
      smoothstep(0.42, 0.56, radius) * (1 - smoothstep(0.92, 1.04, radius));
    if (band === 0) {
      return 0;
    }
    const phase = fract(Math.atan2(dx, -dy) / TAU - t * 0.85);
    const comet = (1 - phase) ** 2.4;
    return band * Math.max(0.07, comet);
  };

/** A 3x3 matrix of dots, pulsing in a diagonal wave. */
const dotsField =
  ({ cols }: Grid): ToneField =>
  (x, y, t) => {
    const pitch = cols / 3;
    const gap = Math.max(1, Math.round(pitch * 0.22));
    const column = Math.floor(x / pitch);
    const row = Math.floor(y / pitch);
    const inDot =
      x - Math.floor(column * pitch) < Math.round(pitch) - gap &&
      y - Math.floor(row * pitch) < Math.round(pitch) - gap;
    if (!inDot) {
      return 0;
    }
    const wave = 0.5 + 0.5 * Math.cos(TAU * (t * 0.7 - (column + row) / 6));
    return 0.1 + 0.9 * wave ** 1.8;
  };

/** A bright band sweeping back and forth along a faint track. */
const barField =
  ({ cols }: Grid): ToneField =>
  (x, _y, t) => {
    const u = (x + 0.5) / cols;
    const head = 0.5 - 0.5 * Math.cos(t * 2.4);
    const distance = (u - head) / 0.16;
    return Math.max(0.12, Math.exp(-distance * distance));
  };

/**
 * A square that dissolves in from its centre, holds, then dissolves out.
 * A faint outline stays, so the loader never disappears completely.
 */
const squareField =
  ({ cols, rows }: Grid): ToneField =>
  (x, y, t) => {
    const dx = Math.abs(x + 0.5 - cols / 2) / (cols / 2);
    const dy = Math.abs(y + 0.5 - rows / 2) / (rows / 2);
    const edge = Math.max(dx, dy);
    if (edge > 0.8) {
      return 0;
    }
    // 0 → 1 → 0 over 1.8 seconds, easing at both ends.
    const cycle = 0.5 - 0.5 * Math.cos((t / 1.8) * TAU);
    const fill = clamp01(cycle * 1.5 - (edge / 0.8) * 0.5);
    const outline = edge > 0.8 - 2 / cols ? 0.3 : 0.06;
    return Math.max(outline, fill);
  };

const FIELDS = {
  bar: barField,
  dots: dotsField,
  ring: ringField,
  square: squareField,
} as const satisfies Record<LoaderVariant, (grid: Grid) => ToneField>;

// The still frame each variant shows under reduced motion.
const STILL_TIME = {
  bar: 0.65,
  dots: 0.3,
  ring: 0,
  square: 0.62,
} as const satisfies Record<LoaderVariant, number>;

const gridFor = (variant: LoaderVariant, height: number, cell: number) => {
  const rows = Math.max(4, Math.round(height / cell));
  switch (variant) {
    case "bar": {
      return { cols: rows * 3, rows: Math.max(2, Math.round(rows / 4)) };
    }
    case "ring":
    case "dots":
    case "square": {
      return { cols: rows, rows };
    }
    default: {
      const exhaustive: never = variant;
      return exhaustive;
    }
  }
};

const toByte = (value: number) => Math.round(clamp01(value) * 255);

/**
 * A small dithered loading indicator: a ring, a pulsing dot matrix, a bar
 * scanner or a dissolving square. It announces `label` politely to screen
 * readers, holds a still frame under reduced motion, and pauses offscreen.
 */
export const Loader = ({
  variant = "ring",
  size = "md",
  label = "Loading",
  color = "--dither-ink",
  matrix = "bayer4",
  cell = 2,
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

  const { cols, rows } = gridFor(variant, HEIGHT[size], Math.max(1, cell));
  const field = useMemo(
    () => FIELDS[variant]({ cols, rows }),
    [variant, cols, rows]
  );

  const draw = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context || !ink) {
        return;
      }
      if (
        frameRef.current?.width !== cols ||
        frameRef.current.height !== rows
      ) {
        frameRef.current = context.createImageData(cols, rows);
      }
      const frame = frameRef.current;
      const { data } = frame;
      const [red, green, blue, alpha] = ink.map(toByte);
      for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
          const offset = (y * cols + x) * 4;
          const on = isInked(matrix, x, y, field(x, y, time));
          data[offset] = red ?? 0;
          data[offset + 1] = green ?? 0;
          data[offset + 2] = blue ?? 0;
          data[offset + 3] = on ? (alpha ?? 255) : 0;
        }
      }
      context.putImageData(frame, 0, 0);
    },
    [cols, rows, field, ink, matrix]
  );

  // Snap cells to whole device pixels, as the shader does, so every cell is the same size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    const devicePixels = Math.max(1, Math.round(cell * ratio));
    canvas.style.width = `${(cols * devicePixels) / ratio}px`;
    canvas.style.height = `${(rows * devicePixels) / ratio}px`;
  }, [cell, cols, rows]);

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
        style={{ height: rows * cell, width: cols * cell }}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};
