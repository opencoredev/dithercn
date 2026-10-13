"use client";

import { useEffect, useRef } from "react";

import { ditherImage, useDitherColors } from "@/lib/dither";
import type { DitherMethod, Rgba } from "@/lib/dither";

const SIZE = 96;
const METHODS: DitherMethod[] = [
  "bayer4",
  "blue-noise",
  "floyd-steinberg",
  "atkinson",
];

// A test picture: a lit sphere on a soft vertical gradient.
const testImage = () => {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const dx = (x - SIZE * 0.55) / (SIZE * 0.3);
      const dy = (y - SIZE * 0.5) / (SIZE * 0.3);
      const inside = dx * dx + dy * dy;
      const sky = 0.15 + 0.35 * (y / SIZE);
      const light = Math.max(0, 1 - Math.hypot(dx + 0.45, dy + 0.45) / 1.6);
      const tone = inside < 1 ? 0.1 + 0.9 * light : sky;
      const offset = (y * SIZE + x) * 4;
      data.fill(Math.round(tone * 255), offset, offset + 3);
      data[offset + 3] = 255;
    }
  }
  return { data, height: SIZE, width: SIZE };
};

const DitheredCanvas = ({
  method,
  paper,
  ink,
}: {
  method: DitherMethod;
  paper: Rgba;
  ink: Rgba;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const context = ref.current?.getContext("2d");
    if (!context) {
      return;
    }
    // Dark pixels become paper and light ones ink, so the picture reads
    // the same on a black or a white page.
    const result = ditherImage(testImage(), {
      method,
      palette: [
        [0, 0, 0],
        [1, 1, 1],
      ],
    });
    const { data } = result;
    for (let index = 0; index < data.length; index += 4) {
      const color = (data[index] ?? 0) > 127 ? ink : paper;
      data[index] = color[0] * 255;
      data[index + 1] = color[1] * 255;
      data[index + 2] = color[2] * 255;
    }
    context.putImageData(result, 0, 0);
  }, [method, paper, ink]);

  return (
    <canvas
      ref={ref}
      width={SIZE}
      height={SIZE}
      className="aspect-square w-full rounded-lg [image-rendering:pixelated]"
    />
  );
};

export default function ConceptDiffusion() {
  const root = useRef<HTMLDivElement>(null);
  const colors = useDitherColors(root);

  return (
    <div ref={root} className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
      {METHODS.map((method) => (
        <figure key={method} className="flex flex-col gap-1.5">
          {colors ? (
            <DitheredCanvas method={method} ink={colors[0]} paper={colors[1]} />
          ) : (
            <div className="aspect-square w-full" />
          )}
          <figcaption className="font-mono text-xs">{method}</figcaption>
        </figure>
      ))}
    </div>
  );
}
