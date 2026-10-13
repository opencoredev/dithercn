"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

export type AuroraProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** Where the curtains' bright lower edge hangs, 0 (bottom) to 1 (top). Default 0.42. */
  height?: number;
  /** How far the curtains sway, 0 (straight) to 2. Default 1. */
  sway?: number;
  /** Brightness of the curtains, 0 to 1. Default 0.95. */
  intensity?: number;
};

const AURORA_PALETTE = [
  "--dither-paper",
  "color-mix(in oklch, var(--dither-ink) 30%, var(--dither-paper))",
  "color-mix(in oklch, var(--dither-ink) 70%, var(--dither-paper))",
  "--dither-ink",
  "color-mix(in oklch, var(--dither-ink) 50%, var(--foreground))",
] as const satisfies DitherPalette;

const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  float x = uv.x * aspect;
  float light = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float base = auroraHeight + fi * 0.11;
    float edge = base
      + auroraSway * 0.11 * snoise(vec2(x * 0.55 + fi * 3.1, t * 0.035 + fi * 1.7))
      + auroraSway * 0.035 * snoise(vec2(x * 1.9 - fi, t * 0.06));
    float above = uv.y - edge;
    float curtain = above > 0.0
      ? exp(-above * (5.5 + fi * 2.5))
      : exp(above * 45.0);
    float bend = snoise(vec2(x * 0.8, t * 0.03 + fi)) * 0.6;
    float rays = smoothstep(0.3, 0.78, fbm(vec2((x + bend) * 8.0 + fi * 9.0, t * 0.045 + fi)));
    rays *= 0.6 + 0.4 * (0.5 + 0.5 * snoise(vec2((x + bend) * 26.0, fi * 4.0 + t * 0.02)));
    float patch = smoothstep(0.3, 0.62, fbm(vec2(x * 0.45 + fi * 5.0, t * 0.02 + fi * 2.0)));
    float rim = exp(-abs(above) * 28.0) * 0.9;
    light += (curtain * rays + rim * (0.4 + 0.6 * rays)) * patch * (1.0 - fi * 0.3);
  }
  float shimmer = 0.92 + 0.08 * sin(t * 0.4 + uv.x * 3.0);
  return (1.0 - exp(-light * 1.5)) * auroraIntensity * shimmer;
}
`;

/**
 * Slow vertical curtains of light that sway and shimmer, drawn as a
 * dither. Decorative and full-bleed: size it with `className`, usually
 * `absolute inset-0`.
 */
export const Aurora = ({
  height = 0.42,
  sway = 1,
  intensity = 0.95,
  palette = AURORA_PALETTE,
  matrix = "bayer8",
  ...props
}: AuroraProps) => {
  const ink = cssColor(palette.at(-2) ?? palette[1]);
  const edge = `${(height * 100).toFixed(1)}%`;

  return (
    <DitherShader
      {...props}
      field={FIELD}
      palette={palette}
      matrix={matrix}
      uniforms={{
        auroraHeight: height,
        auroraIntensity: intensity,
        auroraSway: sway,
      }}
      fallback={
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: cssColor(palette[0]),
            backgroundImage: `linear-gradient(to top, transparent ${edge}, color-mix(in oklch, ${ink} 45%, transparent) calc(${edge} + 4%), transparent 85%)`,
          }}
        />
      }
    />
  );
};
