"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

export type PlasmaProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** Size of the blobs. Higher values pack more of them in. Default 1. */
  scale?: number;
  /** How far slow noise bends the interference pattern, 0 to 1. Default 0.3. */
  warp?: number;
  /** How many times the colours cycle across one wave. Default 1.5. */
  bands?: number;
  /** The brightest tone, 0 to 1. Lower it to sit text on top. Default 1. */
  intensity?: number;
};

const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) * 4.2 * plasmaScale;

  // A slow noise warp keeps the classic sine pattern from looking mechanical.
  vec2 warp = vec2(
    fbm(p * 0.35 + vec2(t * 0.05, 0.0)),
    fbm(p * 0.35 + vec2(3.7, 1.9) - vec2(0.0, t * 0.04))
  ) - 0.5;
  p += warp * 3.0 * plasmaWarp;

  float v = sin(p.x * 0.9 + t * 0.31);
  v += sin(p.y * 1.1 - t * 0.23);
  v += sin((p.x * 0.6 + p.y * 0.8) * 1.2 + t * 0.17);
  vec2 orbit = vec2(sin(t * 0.13) * 1.6, cos(t * 0.11) * 1.2);
  v += sin(length(p - orbit) * 1.4 - t * 0.29);

  float tone = 0.5 + 0.5 * sin(v * 0.785398 * plasmaBands);
  // Bias towards paper so the darks open up and only the crests reach ink.
  tone = pow(smoothstep(0.05, 1.0, tone), 1.7);
  return tone * plasmaIntensity;
}
`;

const DEFAULT_PLASMA_PALETTE: DitherPalette = [
  "--dither-paper",
  "--chart-5",
  "--dither-ink",
];

/** Soft overlapping blobs in the palette's colours, shown without WebGL. */
const fallbackImage = (palette: DitherPalette, intensity: number) => {
  const top = cssColor(palette.at(-1) ?? palette[1]);
  const mid = cssColor(palette[1]);
  const paper = cssColor(palette[0]);
  const fade = `${Math.round(intensity * 70)}%`;
  return [
    `radial-gradient(ellipse 45% 55% at 28% 35%, color-mix(in oklab, ${top} ${fade}, transparent), transparent 70%)`,
    `radial-gradient(ellipse 50% 45% at 72% 68%, color-mix(in oklab, ${mid} ${fade}, transparent), transparent 70%)`,
    `linear-gradient(${paper}, ${paper})`,
  ].join(", ");
};

/**
 * Classic plasma: overlapping sine waves that flow into each other, drawn as
 * a dither. Works in two colours or a whole palette. Decorative and
 * full-bleed: size it with `className`, usually `absolute inset-0`.
 */
export const Plasma = ({
  scale = 1,
  warp = 0.3,
  bands = 1.5,
  intensity = 1,
  palette = DEFAULT_PLASMA_PALETTE,
  stillTime = 9,
  ...props
}: PlasmaProps) => (
  <DitherShader
    {...props}
    field={FIELD}
    palette={palette}
    stillTime={stillTime}
    uniforms={{
      plasmaBands: Math.max(0.1, bands),
      plasmaIntensity: Math.min(1, Math.max(0, intensity)),
      plasmaScale: Math.max(0.05, scale),
      plasmaWarp: Math.max(0, warp),
    }}
    fallback={
      <div
        className="absolute inset-0"
        style={{ backgroundImage: fallbackImage(palette, intensity) }}
      />
    }
  />
);
