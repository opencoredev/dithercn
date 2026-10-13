"use client";

import { useEffect, useMemo, useRef } from "react";

import { DitherExportPanel } from "@/components/dithercn/dither-export-panel";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/export-controls";
import { ditherImage, useDitherColors } from "@/lib/dither";
import type { Rgba } from "@/lib/dither";

const COLS = 120;
const ROWS = 72;

const HORIZON = 0.64;

// A sun setting on a horizon with its reflection, as greys from 0 to 255.
const toneAt = (u: number, v: number) => {
  const x = u * (COLS / ROWS);
  if (v < HORIZON) {
    const distance = Math.hypot(x, v - HORIZON + 0.02);
    const disc = distance < 0.26 ? 1 : 0;
    const glow = Math.exp(-((distance - 0.26) ** 2) * 22) * 0.6;
    return Math.max(disc, 0.42 * (v / HORIZON) ** 3 + glow);
  }
  const depth = (v - HORIZON) / (1 - HORIZON);
  const reflection = Math.exp(-((x / (0.16 + depth * 0.3)) ** 2)) * (1 - depth);
  return 0.8 * reflection;
};

const TONES = Float32Array.from({ length: COLS * ROWS }, (_, index) =>
  Math.min(
    1,
    toneAt(
      ((index % COLS) + 0.5) / COLS - 0.5,
      (Math.floor(index / COLS) + 0.5) / ROWS
    )
  )
);

const GREYS = (() => {
  const data = new Uint8ClampedArray(COLS * ROWS * 4);
  for (let index = 0; index < TONES.length; index += 1) {
    data.fill((TONES[index] ?? 0) * 255, index * 4, index * 4 + 3);
    data[index * 4 + 3] = 255;
  }
  return { data, height: ROWS, width: COLS };
})();

/**
 * Dither the greys black and white, then paint black as paper and white
 * as ink. Ordered dithers spread their threshold over the whole 0 to 1
 * range, so dithering straight to two close colours leaves stray cells.
 */
const paint = (
  method: (typeof knobs.method.options)[number],
  paper: Rgba,
  ink: Rgba
) => {
  const result = ditherImage(GREYS, {
    method,
    palette: [
      [0, 0, 0],
      [1, 1, 1],
    ],
  });
  const { data } = result;
  for (let offset = 0; offset < data.length; offset += 4) {
    const color = (data[offset] ?? 0) > 127 ? ink : paper;
    data[offset] = color[0] * 255;
    data[offset + 1] = color[1] * 255;
    data[offset + 2] = color[2] * 255;
  }
  return result;
};

export default function ExportDemo() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const tint = usePreviewValue(knobs.tint);
  const method = usePreviewValue(knobs.method);
  const cell = usePreviewValue(knobs.cell);
  const colors = useDitherColors(root, [tint, "--card"]);

  const image = useMemo(() => {
    if (!colors) {
      return null;
    }
    const [ink, paper]: readonly [Rgba, Rgba] = colors;
    return paint(method, paper, ink);
  }, [colors, method]);

  useEffect(() => {
    if (image) {
      canvas.current?.getContext("2d")?.putImageData(image, 0, 0);
    }
  }, [image]);

  return (
    <div
      ref={root}
      className="grid w-full max-w-2xl items-center gap-6 sm:grid-cols-[minmax(0,1fr)_19rem]"
    >
      <figure className="grid gap-2.5">
        <canvas
          ref={canvas}
          width={COLS}
          height={ROWS}
          role="img"
          aria-label="A dithered sun setting over a horizon"
          className="aspect-[120/72] w-full rounded-xl outline-1 -outline-offset-1 outline-white/10 [image-rendering:pixelated]"
        />
        <figcaption className="text-muted-foreground font-mono text-[11px] tabular-nums">
          {COLS} × {ROWS} cells · {cell}px each
        </figcaption>
      </figure>
      <DitherExportPanel
        image={image}
        cell={cell}
        filename="sunset"
        className="bg-background/50 ring-border/60 rounded-[20px] p-4 ring-1"
      />
    </div>
  );
}
