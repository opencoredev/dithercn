# Recipes

Complete components that work as written. Adapt them: change the field, the props, the colours. Imports assume the `@/lib/dither` alias.

## A shader background with props

The shape every dithered background follows: typed props become uniforms, the field is a constant, and the fallback resembles the dither.

```tsx
"use client";

import { cssColor, DEFAULT_PALETTE, DitherShader } from "@/lib/dither";
import type { DitherShaderProps } from "@/lib/dither";

const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 focus = vec2(driftFocus.x * aspect, 1.0 - driftFocus.y);
  float light = exp(-dot(p - focus, p - focus) * driftTightness);
  float clouds = fbm(p * driftScale + vec2(t * 0.03, -t * 0.015));
  return driftIntensity * light * mix(0.55, 1.15, clouds);
}
`;

export type DriftGlowProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** Where the light sits, from the top left, 0 to 1. Default [0.5, 0]. */
  focus?: readonly [number, number];
  /** Peak tone, 0 to 1. Default 0.8. */
  intensity?: number;
  /** Cloud size; bigger numbers make smaller clouds. Default 2.5. */
  scale?: number;
  /** How tightly the light gathers. Default 3. */
  tightness?: number;
};

export const DriftGlow = ({
  focus = [0.5, 0],
  intensity = 0.8,
  scale = 2.5,
  tightness = 3,
  palette = DEFAULT_PALETTE,
  matrix = "bayer8",
  ...props
}: DriftGlowProps) => (
  <DitherShader
    {...props}
    field={FIELD}
    palette={palette}
    matrix={matrix}
    stillTime={6}
    uniforms={{
      driftFocus: focus,
      driftIntensity: intensity,
      driftScale: scale,
      driftTightness: tightness,
    }}
    fallback={
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: cssColor(palette[0]),
          backgroundImage: `radial-gradient(ellipse at ${focus[0] * 100}% ${focus[1] * 100}%, color-mix(in oklch, ${cssColor(palette.at(-1) ?? palette[1])} 45%, transparent), transparent 70%)`,
        }}
      />
    }
  />
);
```

Use it:

```tsx
<section className="relative isolate overflow-hidden rounded-3xl border">
  <DriftGlow
    className="absolute inset-0 -z-10"
    palette={["--dither-paper", "blue"]}
  />
  <div className="px-8 py-28 text-center">…</div>
</section>
```

## A hero that clears its headline

A full-bleed field behind a headline, with a rounded box cleared around the text block. The page measures the text and passes its box to the field, so the clearing fits the copy at every width, and a phone gets the same margin as a desktop. Swap the contour lines for any field: the clearing is the `d`, `dist` and `clear` lines of `field`.

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

import { DitherShader } from "@/lib/dither";

const FIELD = `
float heroHeight(vec2 p) {
  return 0.5 + 0.35 * snoise(p * 0.9) + 0.15 * snoise(p * 2.1);
}

float heroContour(float h, float hx, float hy, float count, float width) {
  float offset = abs(fract(h * count + 0.5) - 0.5);
  float perCell = max(length(vec2(hx - h, hy - h)) * count, 1e-4);
  float line = 1.0 - smoothstep(width * 0.5 - 0.5, width * 0.5 + 0.5, offset / perCell);
  return line * (1.0 - smoothstep(0.06, 0.1, offset));
}

float field(vec2 uv, vec2 res, float t) {
  vec2 p = vec2(uv.x * res.x / res.y, uv.y) * heroScale + vec2(t * 0.012, t * 0.005);
  float step1 = heroScale / res.y;
  float h = heroHeight(p);
  float lines = heroContour(h, heroHeight(p + vec2(step1, 0.0)), heroHeight(p + vec2(0.0, step1)), 9.0, 1.5);

  // Distance in cells from the rounded box around the text: 0 inside, ink
  // returns over heroFeather cells outside it.
  vec2 d = abs((uv - heroBox.xy) * res) - heroBox.zw * res + heroRadius;
  float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - heroRadius;
  float clear = smoothstep(0.0, heroFeather, dist);
  // Thin out towards the bottom edge so the next section starts clean.
  return 0.85 * lines * clear * smoothstep(0.0, 0.3, uv.y);
}
`;

type Box = readonly [number, number, number, number];

/**
 * The text block's box inside the section, as the field reads it: centre
 * in uv (0 to 1, y up) and half width and height as a fraction of the
 * section, padded by `pad` CSS pixels.
 */
const useClearBox = (
  section: React.RefObject<HTMLElement | null>,
  text: React.RefObject<HTMLElement | null>,
  pad = 24
): Box => {
  const [box, setBox] = useState<Box>([0.5, 0.5, 0, 0]);
  useEffect(() => {
    const host = section.current;
    const block = text.current;
    if (!(host && block)) {
      return;
    }
    const measure = () => {
      const s = host.getBoundingClientRect();
      const r = block.getBoundingClientRect();
      if (s.width === 0 || s.height === 0) {
        return;
      }
      setBox([
        (r.left - s.left + r.width / 2) / s.width,
        1 - (r.top - s.top + r.height / 2) / s.height,
        (r.width / 2 + pad) / s.width,
        (r.height / 2 + pad) / s.height,
      ]);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    observer.observe(block);
    return () => observer.disconnect();
  }, [section, text, pad]);
  return box;
};

export const ContourHero = ({ children }: { children: React.ReactNode }) => {
  const section = useRef<HTMLElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const box = useClearBox(section, text);
  return (
    <section
      ref={section}
      className="relative isolate flex min-h-[640px] items-center overflow-hidden"
    >
      <DitherShader
        className="absolute inset-0 -z-10"
        field={FIELD}
        palette={["--dither-paper", "--dither-ink"]}
        stillTime={8}
        uniforms={{
          heroBox: box,
          heroFeather: 10,
          heroRadius: 8,
          heroScale: 1.5,
        }}
        fallback={<div className="absolute inset-0 bg-dither-paper" />}
      />
      <div ref={text} className="mx-auto w-fit max-w-2xl px-6 text-center">
        {children}
      </div>
    </section>
  );
};
```

- Measure the element that holds the text, sized to it (`w-fit`), not a full-width wrapper, or the box clears the whole row.
- `pad` is CSS pixels of quiet ground around the text; `heroFeather` is how many cells the ink takes to return. 24px and 10 cells read as a deliberate margin, not a hole.
- Every value is relative to the section, so cell size and device pixel ratio don't matter.
- More than one block to clear (a headline and a screenshot): pass a second box uniform and multiply the two `smoothstep`s.

## An SVG chart fill

Static, server-renderable, sharp. The track uses a sparse fill and the data a dense ramp.

```tsx
import { FillPattern } from "@/lib/dither";
import type { DitherColor } from "@/lib/dither";

export type DitherBarsProps = {
  values: readonly number[];
  label: string;
  color?: DitherColor;
  /** Unique on the page; used for the pattern ids. */
  id: string;
};

const WIDTH = 240;
const HEIGHT = 96;

export const DitherBars = ({
  values,
  label,
  color = "ink",
  id,
}: DitherBarsProps) => {
  const max = Math.max(1, ...values);
  const step = WIDTH / values.length;
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-24 w-full"
      role="img"
      aria-label={label}
    >
      <defs>
        <FillPattern
          id={`${id}-bar`}
          fill="gradient"
          color={color}
          ramp={{ edge: "bottom", at: HEIGHT, length: HEIGHT }}
        />
        <FillPattern id={`${id}-track`} fill="dotted" color="grey" />
      </defs>
      {values.map((value, index) => {
        const height = (value / max) * HEIGHT;
        const x = index * step + 2;
        return (
          <g key={x}>
            <rect
              x={x}
              y={0}
              width={step - 4}
              height={HEIGHT}
              fill={`url(#${id}-track)`}
              opacity={0.5}
            />
            <rect
              x={x}
              y={HEIGHT - height}
              width={step - 4}
              height={height}
              fill={`url(#${id}-bar)`}
            />
          </g>
        );
      })}
    </svg>
  );
};
```

The bar's ramp is anchored to the bottom of the chart (`at: HEIGHT`), so every bar is densest at its base and taller bars thin out towards their tops. To make each bar densest at its own top instead, give each one its own pattern: `<pattern id={`${id}-b${index}`} href={`#${id}-bar`} y={top} />` after a ramp with `edge: "top", at: 0`.

## A DOM progress bar

```tsx
import { fillStyle } from "@/lib/dither";
import type { DitherColor } from "@/lib/dither";

export const DitherProgress = ({
  value,
  label,
  color = "ink",
}: {
  value: number;
  label: string;
  color?: DitherColor;
}) => {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative h-3 overflow-hidden rounded-sm"
    >
      <div
        className="absolute inset-0 opacity-40"
        style={fillStyle("dotted", { color: "grey" })}
      />
      <div
        className="absolute inset-y-0 left-0 transition-[width] duration-500 motion-reduce:transition-none"
        style={{
          width: `${percent}%`,
          ...fillStyle("gradient", {
            color,
            edge: "right",
            length: 48,
            to: 0.25,
          }),
        }}
      />
    </div>
  );
};
```

## A dithered photo

```tsx
"use client";

import { useEffect, useRef } from "react";

import { ditherImage, useDitherColors } from "@/lib/dither";

/** Draws `src` at one pixel per cell, dithered to the theme's paper and ink. */
export const DitheredPhoto = ({
  src,
  alt,
  cell = 3,
}: {
  src: string;
  alt: string;
  cell?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colors = useDitherColors(canvasRef); // [ink, paper]

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !colors) {
      return;
    }
    const [ink, paper] = colors;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const width = Math.round(canvas.clientWidth / cell);
      const height = Math.round((width * image.height) / image.width);
      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      const dithered = ditherImage(context.getImageData(0, 0, width, height), {
        method: "atkinson",
        palette: [paper, ink],
      });
      context.putImageData(dithered, 0, 0);
    };
    image.src = src;
  }, [src, cell, colors]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={alt}
      className="w-full [image-rendering:pixelated]"
    />
  );
};
```

The palette goes from dark to light pixels: `[paper, ink]` maps dark pixels to paper. Swap it for a negative.

## A CSS-only band

```tsx
import { toCSS } from "@/lib/dither/export";

const BANDS = [0.5, 0.25, 0.125, 0.0625] as const;
const css = BANDS.map((level, index) =>
  toCSS({
    level,
    cell: 4,
    ink: "--dither-ink",
    mode: "mask",
    selector: `.fade-band-${index}`,
  })
).join("\n");

export const DitherFadeBand = () => (
  <div aria-hidden="true" className="flex h-24 flex-col">
    <style>{css}</style>
    {BANDS.map((level, index) => (
      <div key={level} className={`fade-band-${index} flex-1`} />
    ))}
  </div>
);
```

No JavaScript runs for it in the browser; the rules are plain CSS masks that follow the theme.
