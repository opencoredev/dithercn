"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

export type StarfieldProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** How many stars, 0 to 2. Default 1. */
  density?: number;
  /** How much each star pulses, 0 (steady) to 1. Default 0.6. */
  twinkle?: number;
  /** Direction the stars drift, in degrees as in CSS: 0 is up, 90 right. Default 270. */
  angle?: number;
  /** Drift speed of the nearest layer, in cells per second. 0 holds them still. Default 1.6. */
  drift?: number;
  /** Strength of a faint dithered haze behind the stars, 0 to 1. Default 0.5. */
  nebula?: number;
};

/**
 * Three layers of stars on grids of different sizes. Each grid square holds
 * at most one star, so stars never clump. Brightness snaps to whole palette
 * steps so a star is always one solid colour and never flickers between
 * dither thresholds as it drifts.
 */
const FIELD = `
float starLayer(vec2 cell, float grid, vec2 offset, float density, float peak, float t, float seed) {
  vec2 q = cell + offset;
  vec2 id = floor(q / grid);
  vec2 local = floor(q - id * grid);
  if (hash21(id + seed) > density) {
    return 0.0;
  }
  vec2 at = floor(vec2(hash21(id + seed + 7.1), hash21(id + seed + 13.7)) * (grid - 2.0)) + 1.0;
  vec2 d = abs(local - at);
  float rate = 0.5 + 1.7 * hash21(id + seed + 5.3);
  float pulse = 0.5 + 0.5 * sin(t * rate + hash21(id + seed + 2.9) * 40.0);
  float b = peak * (0.45 + 0.55 * hash21(id + seed + 3.3));
  b *= mix(1.0, pulse, starTwinkle);
  float core = step(d.x + d.y, 0.5);
  // The brightest stars get a small cross, one step dimmer than the core.
  float arms = step(d.x + d.y, 1.5) * step(0.82, b) * (b - 1.0 / starSteps);
  return max(core * b, arms);
}

float field(vec2 uv, vec2 res, float t) {
  vec2 cell = uv * res;
  float a = radians(starAngle);
  vec2 dir = vec2(sin(a), cos(a));
  vec2 travel = -dir * t * starDrift;

  float stars = starLayer(cell, 7.0, travel * 0.3, 0.32 * starDensity, 0.55, t, 0.0);
  stars = max(stars, starLayer(cell, 13.0, travel * 0.6, 0.42 * starDensity, 0.85, t, 41.0));
  stars = max(stars, starLayer(cell, 23.0, travel, 0.5 * starDensity, 1.0, t, 83.0));
  // Snap to whole palette steps; any visible star gets at least the first.
  float snapped = max(floor(stars * starSteps + 0.35) / starSteps, 1.0 / starSteps);
  stars = stars > 0.12 ? snapped : 0.0;

  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) + travel * 0.15 / res.y;
  float haze = smoothstep(0.52, 0.95, fbm(p * 1.4 + vec2(2.3, 7.1)));
  float nebula = haze * 0.22 * starNebula;
  return max(stars, nebula);
}
`;

const DEFAULT_STAR_PALETTE: DitherPalette = [
  "--dither-paper",
  "--chart-2",
  "--dither-ink",
];

/** Tiled CSS dots in the brightest colour, shown without WebGL. */
const fallbackImage = (palette: DitherPalette) => {
  const star = cssColor(palette.at(-1) ?? palette[1]);
  const dim = cssColor(palette[1]);
  const dots = [
    [star, 17, 23],
    [dim, 61, 47],
    [star, 103, 89],
    [dim, 139, 11],
    [dim, 31, 131],
    [star, 157, 149],
  ] as const;
  return dots
    .map(
      ([color, x, y]) =>
        `radial-gradient(circle at ${x}px ${y}px, ${color} 1px, transparent 1.5px)`
    )
    .join(", ");
};

/**
 * A night sky of dithered stars in three parallax layers that twinkle and
 * drift slowly. Decorative and full-bleed: size it with `className`,
 * usually `absolute inset-0`.
 */
export const Starfield = ({
  density = 1,
  twinkle = 0.6,
  angle = 270,
  drift = 1.6,
  nebula = 0.5,
  palette = DEFAULT_STAR_PALETTE,
  levels,
  matrix = "blue-noise",
  stillTime = 6,
  ...props
}: StarfieldProps) => {
  const steps = palette.length - 1;
  return (
    <DitherShader
      {...props}
      field={FIELD}
      matrix={matrix}
      palette={palette}
      // Enough levels that every palette step is exact, so stars stay solid.
      levels={levels ?? Math.min(256, steps * 16 + 1)}
      stillTime={stillTime}
      uniforms={{
        starAngle: angle,
        starDensity: Math.min(2, Math.max(0, density)),
        starDrift: drift,
        starNebula: Math.min(1, Math.max(0, nebula)),
        starSteps: steps,
        starTwinkle: Math.min(1, Math.max(0, twinkle)),
      }}
      fallback={
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: cssColor(palette[0]),
            backgroundImage: fallbackImage(palette),
            backgroundSize: "173px 167px",
          }}
        />
      }
    />
  );
};
