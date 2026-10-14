"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

export type SmokeProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** Size of the billows. Higher values make more, smaller ones. Default 1. */
  scale?: number;
  /** How high the smoke climbs before it thins out, 0 to 1. Default 0.8. */
  height?: number;
  /** Sideways wind. Negative blows left, positive right. Default 0.2. */
  wind?: number;
  /** How thick the smoke is, 0 to 1.5. Default 1. */
  density?: number;
};

const FIELD = `
float smokeDensity(vec2 p, float t) {
  // Rising coordinates, stretched upright so the puffs climb in plumes.
  vec2 q = vec2(p.x, p.y * 0.82) - vec2(smokeWind * t * 0.04, t * 0.045);
  // A slow warp curls the plumes as they climb.
  vec2 warp = vec2(
    snoise(q * 0.45 + vec2(0.0, t * 0.012)),
    snoise(q * 0.45 + vec2(5.2, 1.3) - vec2(t * 0.01, 0.0))
  );
  vec2 w = q + warp * 0.6;
  return 0.5 + 0.36 * snoise(w * 0.8) + 0.14 * snoise(w * 1.9 + 3.0);
}

float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y) * 2.2 * smokeScale;

  float d = smokeDensity(p, t);
  // Light from the upper left: smoke that thins that way is lit, the far side in shadow.
  float lit = smokeDensity(p + vec2(-0.2, 0.3), t);
  float light = clamp(0.75 + (d - lit) * 1.6, 0.35, 1.0);

  // Thick at the bottom, thinning out towards smokeHeight.
  float rise = uv.y / max(smokeHeight, 0.05);
  float body = smoothstep(0.3, 0.85, d - rise * 0.5 + 0.25);
  // The top edge follows the plumes, so it never reads as a straight line.
  body *= 1.0 - smoothstep(0.6, 1.2, rise - (d - 0.5) * 0.9);
  // Peaks stop short of solid ink so the dither shows inside the thickest smoke.
  return clamp(body * light * smokeAmount * 0.9, 0.0, 1.0);
}
`;

/** A soft CSS haze rising from the bottom, shown without WebGL. */
const fallbackImage = (palette: DitherPalette, height: number) => {
  const ink = cssColor(palette.at(-1) ?? palette[1]);
  const top = `${Math.round((1 - height) * 100)}%`;
  return `linear-gradient(to top, color-mix(in oklab, ${ink} 45%, transparent), transparent calc(100% - ${top}))`;
};

/**
 * Soft smoke billowing upward and thinning out, lit from above and drawn as
 * a dither. Decorative and full-bleed: size it with `className`, usually
 * `absolute inset-0`.
 */
export const Smoke = ({
  scale = 1,
  height = 0.8,
  wind = 0.2,
  density = 1,
  palette = ["--dither-paper", "--dither-ink"],
  stillTime = 12,
  ...props
}: SmokeProps) => (
  <DitherShader
    {...props}
    field={FIELD}
    palette={palette}
    stillTime={stillTime}
    uniforms={{
      smokeAmount: Math.min(1.5, Math.max(0, density)),
      smokeHeight: Math.min(1, Math.max(0, height)),
      smokeScale: Math.max(0.1, scale),
      smokeWind: wind,
    }}
    fallback={
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: cssColor(palette[0]),
          backgroundImage: fallbackImage(palette, height),
        }}
      />
    }
  />
);
