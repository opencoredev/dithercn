"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ditherImage, useDitherColors } from "@/lib/dither";
import type { Rgba } from "@/lib/dither";
import { download, toCSS, toPNG, toSVG } from "@/lib/dither/export";

const COLS = 144;
const ROWS = 80;
const CELL = 3;

// A soft glow rising from the bottom edge, as greys from 0 to 255.
const glow = () => {
  const data = new Uint8ClampedArray(COLS * ROWS * 4);
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const dx = (x / COLS - 0.5) * (COLS / ROWS);
      const dy = y / ROWS - 1.05;
      const tone = Math.exp(-(dx * dx + dy * dy) * 2.2);
      const offset = (y * COLS + x) * 4;
      data.fill(Math.round(tone * 255), offset, offset + 3);
      data[offset + 3] = 255;
    }
  }
  return { data, height: ROWS, width: COLS };
};

const paint = (paper: Rgba, ink: Rgba) => {
  const result = ditherImage(glow(), {
    method: "bayer4",
    palette: [paper, ink],
  });
  return result;
};

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

export default function ExportDemo() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const colors = useDitherColors(root);
  const [image, setImage] = useState<ImageData | null>(null);
  const [sizes, setSizes] = useState<{
    png: number;
    svg: number;
    css: number;
  }>();

  useEffect(() => {
    if (!colors) {
      return;
    }
    const [ink, paper] = colors;
    const next = paint(paper, ink);
    canvas.current?.getContext("2d")?.putImageData(next, 0, 0);
    setImage(next);
    const measure = async () => {
      const png = await toPNG(next, { scale: CELL });
      setSizes({
        css: toCSS({ image: next, kind: "image" }).length,
        png: png.size,
        svg: toSVG(next, { cell: CELL }).length,
      });
    };
    measure();
  }, [colors]);

  return (
    <div ref={root} className="grid w-[432px] max-w-full gap-4">
      <canvas
        ref={canvas}
        width={COLS}
        height={ROWS}
        role="img"
        aria-label="A dithered glow rising from the bottom edge"
        className="bg-background aspect-[144/80] w-[432px] max-w-full rounded-xl [image-rendering:pixelated]"
      />
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!image}
          onClick={async () => {
            if (image) {
              download({
                data: await toPNG(image, { scale: CELL }),
                filename: "glow.png",
              });
            }
          }}
        >
          PNG{" "}
          {sizes ? (
            <span className="text-muted-foreground">{kb(sizes.png)}</span>
          ) : null}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!image}
          onClick={() => {
            if (image) {
              download({
                data: toSVG(image, { cell: CELL }),
                filename: "glow.svg",
                type: "image/svg+xml",
              });
            }
          }}
        >
          SVG{" "}
          {sizes ? (
            <span className="text-muted-foreground">{kb(sizes.svg)}</span>
          ) : null}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!image}
          onClick={() => {
            if (image) {
              download({
                data: toCSS({ image, kind: "image", selector: ".glow" }),
                filename: "glow.css",
                type: "text/css",
              });
            }
          }}
        >
          CSS{" "}
          {sizes ? (
            <span className="text-muted-foreground">{kb(sizes.css)}</span>
          ) : null}
        </Button>
      </div>
    </div>
  );
}
