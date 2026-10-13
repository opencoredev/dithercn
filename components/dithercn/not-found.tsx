"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";

import {
  bloomStyle,
  isInked,
  useDitherColors,
  useFrameLoop,
} from "@/lib/dither";
import type { Bloom, DitherColor, FillVariant, Rgba } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * The code is set in the page's own font, rasterised once onto a grid of
 * cells, and turned into block letters: each face cell gets a tone that
 * is densest at the top of the glyphs and thins towards the baseline, and
 * the cells behind it, down and to the right, become an extruded side in
 * a sparse dither. Every frame the tones are thresholded with the Bayer
 * matrix and painted into a canvas one pixel per cell. On mount the tones
 * rise from nothing, so the digits print in level by level; after that a
 * band of light crosses the face every few seconds. Reduced motion shows
 * the finished letters, still.
 */

const PRINT_SECONDS = 1.1;
const SWEEP_SECONDS = 5.5;
// Where the still frame sits: after the print, between two sweeps.
const STILL_TIME = PRINT_SECONDS + SWEEP_SECONDS * 0.7;

/** Cell kinds: 0 empty, 1 face, 2 and up the extruded side (2 = nearest the face). */
interface Raster {
  cols: number;
  rows: number;
  kind: Uint8Array;
  /** Vertical position inside the glyphs for face cells, 0 at the top. */
  depth: Float32Array;
}

const rasterise = ({
  code,
  font,
  cols,
  rows,
  extrude,
}: {
  code: string;
  font: string;
  cols: number;
  rows: number;
  extrude: number;
}): Raster | null => {
  const scale = 4;
  const canvas = document.createElement("canvas");
  canvas.width = cols * scale;
  canvas.height = rows * scale;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }
  const pad = extrude + 1;
  // Fit the code into the grid, leaving room for the extruded side.
  context.font = `800 100px ${font}`;
  const metrics = context.measureText(code);
  const ascent = metrics.actualBoundingBoxAscent;
  const descent = metrics.actualBoundingBoxDescent;
  const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
  const size = Math.min(
    ((cols - pad - 1) * scale) / (width / 100),
    ((rows - pad - 1) * scale) / ((ascent + descent) / 100)
  );
  context.font = `800 ${size}px ${font}`;
  const fitted = context.measureText(code);
  const glyphHeight =
    fitted.actualBoundingBoxAscent + fitted.actualBoundingBoxDescent;
  const glyphWidth =
    fitted.actualBoundingBoxLeft + fitted.actualBoundingBoxRight;
  const left = ((cols - pad) * scale - glyphWidth) / 2;
  const top = ((rows - pad) * scale - glyphHeight) / 2;
  context.fillStyle = "#000";
  context.fillText(
    code,
    left + fitted.actualBoundingBoxLeft,
    top + fitted.actualBoundingBoxAscent
  );
  const { data } = context.getImageData(0, 0, cols * scale, rows * scale);
  const kind = new Uint8Array(cols * rows);
  const depth = new Float32Array(cols * rows);
  const topCell = top / scale;
  const heightCells = Math.max(1, glyphHeight / scale);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      let coverage = 0;
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          coverage +=
            data[((y * scale + sy) * cols * scale + x * scale + sx) * 4 + 3] ??
            0;
        }
      }
      if (coverage / (scale * scale * 255) >= 0.5) {
        kind[y * cols + x] = 1;
        depth[y * cols + x] = (y + 0.5 - topCell) / heightCells;
      }
    }
  }
  // The side: cells behind the face along the diagonal, nearest first.
  for (let step = 1; step <= extrude; step += 1) {
    for (let y = rows - 1; y >= step; y -= 1) {
      for (let x = cols - 1; x >= step; x -= 1) {
        const index = y * cols + x;
        if (kind[index] === 0 && kind[(y - step) * cols + x - step] === 1) {
          kind[index] = step + 1;
        }
      }
    }
  }
  return { cols, depth, kind, rows };
};

const mod4 = (value: number) => value % 4;

const TEXTURE = {
  dotted: (x: number, y: number) => y % 2 === 0 && (mod4(x) + y / 2) % 2 === 0,
  hatched: (x: number, y: number) => mod4(x + y) === 3,
} as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

interface PaintOptions {
  raster: Raster;
  fill: FillVariant;
  ink: Rgba;
  time: number;
  extrude: number;
  image: ImageData;
}

/** The light band's position across the face at `time`, or null between sweeps. */
const sweepAt = (time: number) => {
  const phase = (time - PRINT_SECONDS) / SWEEP_SECONDS;
  if (phase < 0) {
    return null;
  }
  const along = (phase - Math.floor(phase)) * 1.8 - 0.3;
  return along > 1.3 ? null : along;
};

const faceInked = ({
  fill,
  tone,
  x,
  y,
}: {
  fill: FillVariant;
  tone: number;
  x: number;
  y: number;
}) => {
  switch (fill) {
    case "gradient": {
      return isInked("bayer4", x, y, tone);
    }
    case "solid": {
      return tone > 0.06;
    }
    case "dotted":
    case "hatched": {
      return tone > 0.9 || (tone > 0.06 && TEXTURE[fill](x, y));
    }
    default: {
      const exhaustive: never = fill;
      return exhaustive;
    }
  }
};

const paint = ({ raster, fill, ink, time, extrude, image }: PaintOptions) => {
  const { cols, rows, kind, depth } = raster;
  const { data } = image;
  const print = clamp01(time / PRINT_SECONDS);
  const sweep = sweepAt(time);
  const span = cols + rows * 0.7;
  const [red, green, blue, alpha] = ink.map((value) =>
    Math.round(clamp01(value) * 255)
  );
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const index = y * cols + x;
      const cell = kind[index] ?? 0;
      let on = false;
      if (cell === 1) {
        const glow =
          sweep === null
            ? 0
            : Math.max(0, 1 - Math.abs((x + y * 0.7) / span - sweep) / 0.06);
        // A lit edge along the tops of the glyphs, then the face thinning downward.
        const lit = y === 0 || kind[index - cols] !== 1;
        const shade = lit ? 1 : 0.95 - 0.4 * (depth[index] ?? 0);
        const tone = (shade + 0.45 * glow) * print;
        on = faceInked({ fill, tone, x, y });
      } else if (cell > 1) {
        // The side fades away from the face.
        const tone =
          (0.22 - (0.12 * (cell - 2)) / Math.max(1, extrude)) * print;
        on = isInked("bayer4", x, y, tone);
      }
      const offset = index * 4;
      data[offset] = red ?? 0;
      data[offset + 1] = green ?? 0;
      data[offset + 2] = blue ?? 0;
      data[offset + 3] = on ? (alpha ?? 255) : 0;
    }
  }
};

/** Width of the root in CSS pixels, kept up to date. */
const useWidth = (ref: { current: HTMLElement | null }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry?.contentRect.width ?? 0));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
};

/** Bumps once the page's fonts have loaded, so the code is set in the right face. */
const useFontsReady = () => {
  const [ready, setReady] = useState(0);
  useEffect(() => {
    let live = true;
    const wait = async () => {
      await document.fonts.ready;
      if (live) {
        setReady((count) => count + 1);
      }
    };
    void wait();
    return () => {
      live = false;
    };
  }, []);
  return ready;
};

interface NumeralProps {
  code: string;
  color: DitherColor;
  fill: FillVariant;
  bloom: Bloom;
  cell: number;
  extrude: number;
  animate: boolean;
}

const Numeral = ({
  code,
  color,
  fill,
  bloom,
  cell,
  extrude,
  animate,
}: NumeralProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rasterRef = useRef<Raster | null>(null);
  const imageRef = useRef<ImageData | null>(null);
  const timeRef = useRef(animate ? 0 : STILL_TIME);
  const width = useWidth(rootRef);
  const fonts = useFontsReady();
  const colors = useDitherColors(rootRef, [color]);
  const ink = colors ? colors[0] : null;
  // One pixel finer on phones, so the digits keep their detail at a smaller size.
  const step = width > 0 && width < 480 ? Math.max(2, cell - 1) : cell;
  const cols = Math.max(24, Math.floor(width / step));
  const rows = Math.max(12, Math.round(cols * 0.4));

  const draw = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      const raster = rasterRef.current;
      const context = canvas?.getContext("2d");
      if (!context || !raster || !ink) {
        return;
      }
      if (
        imageRef.current?.width !== raster.cols ||
        imageRef.current.height !== raster.rows
      ) {
        imageRef.current = context.createImageData(raster.cols, raster.rows);
      }
      paint({ extrude, fill, image: imageRef.current, ink, raster, time });
      context.putImageData(imageRef.current, 0, 0);
    },
    [extrude, fill, ink]
  );

  // Rasterise the code whenever the grid, the text or the font changes.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || width === 0) {
      return;
    }
    rasterRef.current = rasterise({
      code,
      cols,
      extrude,
      font: getComputedStyle(root).fontFamily,
      rows,
    });
    draw(timeRef.current);
  }, [code, cols, rows, extrude, fonts, width, draw]);

  useFrameLoop(
    (time) => {
      timeRef.current = time;
      draw(time);
    },
    { enabled: animate, stillTime: STILL_TIME, target: rootRef }
  );

  return (
    <div ref={rootRef} aria-hidden="true" className="w-full">
      <canvas
        ref={canvasRef}
        width={cols}
        height={rows}
        className="mx-auto block [image-rendering:pixelated]"
        style={{
          aspectRatio: `${cols} / ${rows}`,
          maxWidth: "100%",
          width: cols * step,
          ...bloomStyle(color, bloom),
        }}
      />
    </div>
  );
};

export type NotFoundProps = Omit<
  ComponentProps<"section">,
  "title" | "color"
> & {
  /** The big code. Default `"404"`. */
  code?: string;
  /** The heading. Default `"Page not found"`. */
  title?: ReactNode;
  /** A sentence under the heading. */
  description?: ReactNode;
  /** A short mono line under the text, such as the path that was requested. */
  detail?: ReactNode;
  /** Buttons or links, such as a way home. */
  actions?: ReactNode;
  /** Heading level. Use `"h1"` on a page of its own. Default `"h1"`. */
  titleAs?: "h1" | "h2";
  /** A palette name or any CSS colour. Default `"ink"`. */
  color?: DitherColor;
  /** Texture of the digit faces. Default `"gradient"`. */
  fill?: FillVariant;
  /** A soft glow in the code's colour. Default `"off"`. */
  bloom?: Bloom;
  /** Size of one dither cell in CSS pixels. Default 4. */
  cell?: number;
  /** Depth of the extruded side in cells. 0 for flat digits. Default 4. */
  depth?: number;
  /** Print the digits in on mount and sweep light across them. Default `true`. */
  animate?: boolean;
};

/**
 * A complete 404 block: big dithered block digits with an extruded side,
 * a heading, a sentence, an optional mono detail and your actions. Drop it
 * into `app/not-found.tsx`.
 */
export const NotFound = ({
  code = "404",
  title = "Page not found",
  description = "The link may be broken, or the page may have moved.",
  detail,
  actions,
  titleAs: Heading = "h1",
  color = "ink",
  fill = "gradient",
  bloom = "off",
  cell = 4,
  depth = 4,
  animate = true,
  className,
  ...props
}: NotFoundProps) => (
  <section
    data-slot="not-found"
    className={cn(
      "flex flex-col items-center px-6 py-14 text-center",
      className
    )}
    {...props}
  >
    <div className="w-full max-w-2xl">
      <Numeral
        code={code}
        color={color}
        fill={fill}
        bloom={bloom}
        cell={Math.max(2, Math.round(cell))}
        extrude={Math.max(0, Math.round(depth))}
        animate={animate}
      />
    </div>
    <div className="mt-8 flex max-w-md flex-col gap-2">
      <Heading className="text-2xl font-semibold tracking-tight text-balance">
        {title}
      </Heading>
      {description === undefined ? null : (
        <p className="text-muted-foreground text-pretty">{description}</p>
      )}
    </div>
    {detail === undefined ? null : (
      <p className="text-muted-foreground bg-muted/60 ring-border mt-4 max-w-full truncate rounded-md px-2.5 py-1 font-mono text-xs ring-1">
        {detail}
      </p>
    )}
    {actions === undefined ? null : (
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {actions}
      </div>
    )}
  </section>
);
