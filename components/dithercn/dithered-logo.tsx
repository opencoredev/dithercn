"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps, CSSProperties } from "react";

import {
  CANVAS_CLASS,
  FADE_CLASS,
  rasterize,
  sizeCanvas,
  useDitherGrid,
  useLoadedImage,
  useSeen,
} from "@/components/dithercn/dither-image";
import { thresholdAt, useDitherColors, useFrameLoop } from "@/lib/dither";
import type { DitherColor, DitherMatrix } from "@/lib/dither";
import { cn } from "@/lib/utils";

/**
 * Which part of the logo becomes ink. `"alpha"` suits SVGs and PNGs on a
 * transparent background; `"dark"` suits a dark logo on a light, opaque
 * background.
 */
export type LogoSource = "alpha" | "dark";

export type DitheredLogoProps = Omit<ComponentProps<"div">, "children"> & {
  /** SVG or PNG URL. Cross-origin files need CORS headers. */
  src: string;
  /** The brand name, read out by screen readers. `""` hides it. */
  alt: string;
  /** Ink colour. Default `"--dither-ink"`. */
  color?: DitherColor;
  /** Which pixels become ink. Default `"alpha"`. */
  source?: LogoSource;
  /** Threshold pattern. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Size of one cell in CSS pixels. Default 1, fine enough for small type. */
  cell?: number;
  /**
   * How much the ink thins towards the bottom of the logo, 0 to 1.
   * 0 is solid. Default 0.45.
   */
  shade?: number;
  /** A slow band of ink that sweeps across the logo. Default `false`. */
  shimmer?: boolean;
  /** Seconds per sweep. Default 7. */
  period?: number;
  /** Where in the sweep this logo starts, 0 to 1. Offsets logos in a row. Default 0. */
  phase?: number;
  /**
   * Width over height. Default: the logo's own ratio, once it loads. Set
   * it to reserve the space up front.
   */
  ratio?: number;
};

// Width of the shimmer band, as a share of the logo.
const BAND = 0.16;

/**
 * Coverage per cell, 0 to 1: how much of the cell the logo fills.
 * Rasterising at cell size gives the soft edges the dither feathers.
 */
const coverageOf = (pixels: ImageData, source: LogoSource) => {
  const { data } = pixels;
  const coverage = new Float32Array(pixels.width * pixels.height);
  for (let index = 0; index < coverage.length; index += 1) {
    const offset = index * 4;
    const alpha = (data[offset + 3] ?? 0) / 255;
    if (source === "alpha") {
      coverage[index] = alpha;
      continue;
    }
    const light =
      (0.2126 * (data[offset] ?? 0) +
        0.7152 * (data[offset + 1] ?? 0) +
        0.0722 * (data[offset + 2] ?? 0)) /
      255;
    coverage[index] = (1 - light) * alpha;
  }
  return coverage;
};

/**
 * A logo drawn in dithered ink: the letterforms stay sharp while the ink
 * thins towards the bottom, with an optional slow shimmer. Size it with a
 * height in `className`; the width follows the logo's own ratio.
 */
export const DitheredLogo = ({
  src,
  alt,
  color = "--dither-ink",
  source = "alpha",
  matrix = "bayer4",
  cell = 1,
  shade = 0.45,
  shimmer = false,
  period = 7,
  phase = 0,
  ratio,
  className,
  style,
  ...props
}: DitheredLogoProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seen = useSeen(rootRef);
  const { image, status } = useLoadedImage(src, seen);
  const grid = useDitherGrid(rootRef, cell);
  const colors = useDitherColors(rootRef, [color]);
  const [coverage, setCoverage] = useState<Float32Array | null>(null);
  const workRef = useRef<ImageData | null>(null);

  useEffect(() => {
    if (!(image && grid)) {
      return;
    }
    const pixels = rasterize(image, grid.columns, grid.rows, "contain");
    if (pixels) {
      workRef.current = new ImageData(grid.columns, grid.rows);
      setCoverage(coverageOf(pixels, source));
    }
  }, [image, grid, source]);

  const paint = (time: number) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const work = workRef.current;
    const ink = colors?.[0];
    if (!(context && work && coverage && grid && ink)) {
      return;
    }
    const { columns, rows } = grid;
    const out = work.data;
    // The band travels from just before the left edge to just past the right.
    const sweep = shimmer
      ? (((time / Math.max(0.5, period) + phase) % 1) + 1) % 1
      : -1;
    const center = -BAND * 2 + sweep * (1 + BAND * 4);
    const red = ink[0] * 255;
    const green = ink[1] * 255;
    const blue = ink[2] * 255;
    const alpha = ink[3] * 255;
    for (let y = 0; y < rows; y += 1) {
      const fall = 1 - shade * (y / Math.max(1, rows - 1));
      for (let x = 0; x < columns; x += 1) {
        const index = y * columns + x;
        const cover = coverage[index] ?? 0;
        const offset = index * 4;
        if (cover <= 0) {
          out[offset + 3] = 0;
          continue;
        }
        let density = fall;
        if (sweep >= 0) {
          const along = x / columns - (y / rows) * 0.25;
          const band = Math.exp(-(((along - center) / BAND) ** 2));
          density += (1 - density) * band;
        }
        const inked = cover * density > thresholdAt(matrix, x, y);
        out[offset] = red;
        out[offset + 1] = green;
        out[offset + 2] = blue;
        out[offset + 3] = inked ? alpha : 0;
      }
    }
    context.putImageData(work, 0, 0);
  };

  const loop = useFrameLoop((time) => paint(time), {
    enabled: shimmer && coverage !== null,
    fps: 30,
    stillTime: 0,
    target: rootRef,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!(canvas && grid && coverage)) {
      return;
    }
    sizeCanvas(canvas, grid);
    paint(0);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [coverage, colors, shade, matrix]);

  const aspectRatio =
    ratio ?? (image ? image.naturalWidth / image.naturalHeight : undefined);
  const rootStyle: CSSProperties = { aspectRatio, ...style };
  const decorative = alt === "";

  return (
    <div
      {...props}
      ref={rootRef}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative ? true : undefined}
      data-state={status === "ready" && !coverage ? "loading" : status}
      data-loop={shimmer ? loop : undefined}
      className={cn("relative h-8 shrink-0 overflow-hidden", className)}
      style={rootStyle}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn(
          CANVAS_CLASS,
          FADE_CLASS,
          coverage ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
};
