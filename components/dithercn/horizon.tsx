"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherColor, DitherShaderProps } from "@/lib/dither";

export type HorizonProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback" | "palette"
> & {
  /** Height of the horizon's highest point from the bottom, 0 to 1. Default 0.28. */
  horizon?: number;
  /** How round the planet is, 0 (nearly flat) to 1 (a small globe). Default 0.6. */
  curve?: number;
  /** Strength of the glow above the horizon, 0 to 1. Default 1. */
  glow?: number;
  /** How much the glow ripples into aurora curtains, 0 (a smooth band) to 1. Default 1. */
  aurora?: number;
  /** How many stars in the sky, 0 to 3. Default 1. */
  stars?: number;
  /** Colour of the glow, rim and stars. Default `"--dither-ink"`. */
  glowColor?: DitherColor;
  /** Colour of the sky and the planet. Default `"--dither-paper"`. */
  skyColor?: DitherColor;
};

const FIELD = `
float horizonNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float horizonFbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * horizonNoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    amp *= 0.5;
  }
  return sum / 0.875;
}

float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 world = vec2(uv.x * aspect, uv.y);
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);

  // The planet is a circle in square space whose top touches the horizon.
  float radius = 0.6 * pow(8.0, 1.0 - horizonCurve);
  vec2 centre = vec2(0.0, horizonHeight - radius);
  // Signed distance from the horizon, in box heights.
  float e = length(p - centre) - radius;
  float above = max(e, 0.0);
  float below = max(-e, 0.0);

  // Domain-warped noise, drifting slowly sideways along the horizon.
  vec2 warp = vec2(
    horizonFbm(world * 1.3 + vec2(t * 0.021, 0.0)),
    horizonFbm(world * 1.3 + vec2(5.2, 1.3) - vec2(0.0, t * 0.017))
  );
  float n = horizonFbm(world * vec2(1.1, 2.6) + 1.7 * warp + vec2(t * 0.013, 0.0));

  // Aurora curtains: noise stretched vertically, sliding along the horizon.
  float curtains = horizonFbm(vec2(world.x * 5.0 + 2.0 * warp.x - t * 0.03, above * 6.0 - t * 0.01));
  curtains = mix(0.7, curtains, horizonAurora);
  float lit = 0.35 + 0.9 * n * curtains + 0.25 * n;
  float glow = 1.15 * exp(-above * 11.0) * lit + 0.3 * exp(-above * 5.0) * curtains * curtains;
  glow *= horizonGlow;
  // A lit rim just inside the edge, then the dark planet.
  float rim = exp(-below * 60.0) * (0.85 + 0.4 * n) * mix(0.6, 1.0, horizonGlow);
  float tone = e > 0.0 ? glow : rim;

  // Fixed stars, thinning out towards the glow so the horizon stays clean.
  vec2 cell = floor(uv * res);
  float seed = hash21(vec2(hash21(cell), hash21(cell.yx + 31.7)) * 97.0);
  float star = step(1.0 - 0.0012 * horizonStars, seed) * smoothstep(0.08, 0.3, above);
  return max(tone, star);
}
`;

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

/** A soft CSS glow over a dark arc, shown without WebGL. */
const fallbackImage = ({
  glowColor,
  skyColor,
  horizon,
}: {
  glowColor: DitherColor;
  skyColor: DitherColor;
  horizon: number;
}) => {
  const glow = cssColor(glowColor);
  const sky = cssColor(skyColor);
  const top = percent(1 - horizon);
  return [
    `radial-gradient(ellipse 90% 60% at 50% calc(${top} + 60%), ${sky} 99%, transparent 100%)`,
    `radial-gradient(ellipse 80% 30% at 50% ${top}, color-mix(in oklab, ${glow} 55%, transparent), transparent 70%)`,
    `linear-gradient(${sky}, ${sky})`,
  ].join(", ");
};

/**
 * A planet's horizon seen from space: a lit rim, an aurora glow that drifts
 * along it, and a few fixed stars. The landing page hero, with props.
 * Decorative and full-bleed: size it with `className`, usually
 * `absolute inset-0`.
 */
export const Horizon = ({
  horizon = 0.28,
  curve = 0.6,
  glow = 1,
  aurora = 1,
  stars = 1,
  glowColor = "--dither-ink",
  skyColor = "--dither-paper",
  stillTime = 14,
  ...props
}: HorizonProps) => (
  <DitherShader
    {...props}
    field={FIELD}
    palette={[skyColor, glowColor]}
    stillTime={stillTime}
    uniforms={{
      horizonAurora: Math.min(1, Math.max(0, aurora)),
      horizonCurve: Math.min(1, Math.max(0, curve)),
      horizonGlow: Math.min(1, Math.max(0, glow)),
      horizonHeight: Math.min(0.95, Math.max(0, horizon)),
      horizonStars: Math.min(3, Math.max(0, stars)),
    }}
    fallback={
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: fallbackImage({ glowColor, horizon, skyColor }),
        }}
      />
    }
  />
);
