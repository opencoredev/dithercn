"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

export type DitherGridProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** Height of the horizon from the bottom, 0 to 1. Default 0.42. */
  horizon?: number;
  /** Grid squares across the width at the front edge. Default 10. */
  columns?: number;
  /** How quickly lines fade into the distance, 0 to 1. Default 0.5. */
  fade?: number;
  /** Strength of the glow along the horizon, 0 to 1. Default 0.6. */
  glow?: number;
  /** Rows the floor scrolls towards the viewer per second. 0 holds it still. Default 0.35. */
  scroll?: number;
};

/**
 * A floor plane seen in perspective. Lines are drawn one cell wide by
 * measuring how far each grid coordinate moves per screen cell, so they
 * stay crisp near the viewer and fade out before they turn to moiré.
 */
const FIELD = `
float gridLine(float coord, float perCell) {
  float d = abs(fract(coord + 0.5) - 0.5) / max(perCell, 0.0001);
  return 1.0 - smoothstep(0.35, 1.1, d);
}

float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  float h = gridHorizon;
  float below = h - uv.y;

  // A band of light on the horizon, reflected faintly onto the floor.
  float band = exp(-abs(below) * 16.0);
  float haze = exp(-abs(below) * 5.0);
  float shimmer = 0.75 + 0.25 * fbm(vec2(uv.x * aspect * 2.0 + t * 0.02, 3.0));
  float sky = gridGlow * (0.85 * band + 0.1 * haze) * shimmer;
  if (below <= 0.0) {
    return sky;
  }

  // Depth along the floor: 1 at the bottom edge, growing to infinity at the horizon.
  float z = h / below;
  float x = (uv.x - 0.5) * z * gridColumns;
  // Tiles run deeper than they are wide, as if the camera looked down a little.
  float depth = gridColumns / aspect * 0.4;
  float rows = z * depth + t * gridScroll;

  float dzPerCell = h / (below * below) / res.y;
  float xPerCell = max(z * gridColumns / res.x, abs(x / z) * dzPerCell);
  float rowsPerCell = dzPerCell * depth;

  // Each family of lines fades out before it gets closer than ~3 cells apart.
  float lineX = gridLine(x, xPerCell) * smoothstep(0.32, 0.15, xPerCell);
  float lineZ = gridLine(rows, rowsPerCell) * smoothstep(0.32, 0.15, rowsPerCell);
  float line = max(lineX, lineZ);

  float distance = exp(-(z - 1.0) * (0.04 + 0.3 * gridFade));
  return max(line * distance, sky * 0.55);
}
`;

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

/** A CSS horizon glow over a flat floor tint, shown without WebGL. */
const fallbackImage = (palette: DitherPalette, horizon: number) => {
  const ink = cssColor(palette.at(-1) ?? palette[1]);
  const at = percent(1 - horizon);
  return `radial-gradient(ellipse 70% 18% at 50% ${at}, color-mix(in oklab, ${ink} 45%, transparent), transparent), linear-gradient(to top, color-mix(in oklab, ${ink} 18%, transparent), transparent ${percent(horizon)})`;
};

/**
 * A perspective grid floor that fades into a glowing horizon and scrolls
 * slowly towards the viewer. Decorative and full-bleed: size it with
 * `className`, usually `absolute inset-0`.
 */
export const DitherGrid = ({
  horizon = 0.42,
  columns = 10,
  fade = 0.5,
  glow = 0.6,
  scroll = 0.35,
  palette = ["--dither-paper", "--dither-ink"],
  ...props
}: DitherGridProps) => (
  <DitherShader
    {...props}
    field={FIELD}
    palette={palette}
    uniforms={{
      gridColumns: Math.max(1, columns),
      gridFade: Math.min(1, Math.max(0, fade)),
      gridGlow: Math.min(1, Math.max(0, glow)),
      gridHorizon: Math.min(0.95, Math.max(0.05, horizon)),
      gridScroll: scroll,
    }}
    fallback={
      <div
        className="absolute inset-0"
        style={{ backgroundImage: fallbackImage(palette, horizon) }}
      />
    }
  />
);
