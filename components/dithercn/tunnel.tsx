"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

/** A point relative to the box: x from the left, y from the top. */
export type TunnelCenter = readonly [number, number];

export type TunnelProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** The cross-section of the tunnel. Default `"circle"`. */
  shape?: "circle" | "square";
  /** How close together the rings are. 1 is the default spacing; 2 packs twice as many in. */
  rings?: number;
  /** Lines running along the walls, 0 to 32. 0 leaves only the rings. Default 12. */
  spokes?: number;
  /**
   * The vanishing point, as fractions of the box from the top left.
   * Default `[0.5, 0.5]`.
   */
  center?: TunnelCenter;
  /** How far the vanishing point wanders, 0 holds it still. Default 1. */
  sway?: number;
  /** Size of the empty fog in the middle. 2 doubles it to clear room for text. Default 1. */
  fog?: number;
};

const FIELD = `
float tunnelLine(float offset, float perCell, float width) {
  // offset and width are in ring steps; perCell is one cell in ring steps.
  float d = offset / perCell;
  float w = max(width / perCell, 0.55);
  return 1.0 - smoothstep(w - 0.5, w + 0.5, d);
}

float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 o = vec2(tunnelCenter.x * aspect, 1.0 - tunnelCenter.y);
  o += tunnelSway * vec2(sin(t * 0.07) * 0.05, cos(t * 0.053) * 0.035);
  vec2 c = vec2(uv.x * aspect, uv.y) - o;
  float cellSize = 1.0 / res.y;

  // Distance from the vanishing point: round, or square with max().
  float r = tunnelShape < 0.5 ? length(c) : max(abs(c.x), abs(c.y));
  r = max(r, cellSize * 0.5);

  // Depth goes as 1 / r, so equal steps in depth bunch up towards the centre.
  float density = 7.0 * tunnelRings;
  float depth = 0.32 / r;
  float u = depth * density + t * 0.36;
  float perCell = 0.32 * density / (r * r) * cellSize;
  float ring = tunnelLine(abs(fract(u + 0.5) - 0.5), perCell, 0.045);

  // Spokes along the walls, turning slowly.
  float spoke = 0.0;
  float tile = 0.0;
  if (tunnelSpokes > 0.5) {
    float a = atan(c.y, c.x) / 6.28318531 + t * 0.006;
    if (tunnelShape > 0.5) {
      // Around a square, measure along the walls so spokes run straight into the corners.
      float sideX = c.x / r;
      float sideY = c.y / r;
      if (abs(c.x) >= abs(c.y)) {
        a = c.x > 0.0 ? (sideY + 1.0) * 0.125 : 0.5 + (1.0 - sideY) * 0.125;
      } else {
        a = c.y > 0.0 ? 0.25 + (1.0 - sideX) * 0.125 : 0.75 + (sideX + 1.0) * 0.125;
      }
    }
    float v = a * tunnelSpokes;
    // Every other panel between rings and spokes is lit, like tiles on the walls.
    tile = mod(floor(u) + floor(v), 2.0);
    float perCellA = tunnelSpokes / (mix(6.28318531, 8.0, tunnelShape) * r) * cellSize;
    spoke = tunnelLine(abs(fract(v + 0.5) - 0.5), perCellA, 0.004) * 0.8;
  }

  // Far away the rings crowd closer than a cell: fade them into the fog.
  float fog = smoothstep(0.04 * tunnelFog, 0.4 * tunnelFog, r) * (1.0 - smoothstep(0.25, 0.6, perCell));
  // The walls catch more light as they come closer.
  float wall = tile * 0.2 * smoothstep(0.12, 0.8, r);
  float tone = max(ring * mix(0.5, 1.0, smoothstep(0.1, 0.5, r)), spoke);
  return clamp(max(tone, wall) * fog, 0.0, 1.0);
}
`;

/** Concentric CSS rings fading to the middle, shown without WebGL. */
const fallbackImage = (
  palette: DitherPalette,
  center: TunnelCenter,
  shape: "circle" | "square"
) => {
  const ink = cssColor(palette.at(-1) ?? palette[1]);
  const at = `${(center[0] * 100).toFixed(1)}% ${(center[1] * 100).toFixed(1)}%`;
  const line = `color-mix(in oklab, ${ink} 30%, transparent)`;
  const gradient = shape === "square" ? "closest-side" : "circle";
  return `repeating-radial-gradient(${gradient} at ${at}, transparent 0 22px, ${line} 23px 24px)`;
};

/**
 * A slow flight down a tunnel of rings, drawn as a dither. The rings come
 * out of the fog at the vanishing point and grow as they pass. Decorative
 * and full-bleed: size it with `className`, usually `absolute inset-0`.
 */
export const Tunnel = ({
  shape = "circle",
  rings = 1,
  spokes = 12,
  center = [0.5, 0.5],
  sway = 1,
  fog = 1,
  palette = ["--dither-paper", "--dither-ink"],
  stillTime = 6,
  ...props
}: TunnelProps) => (
  <DitherShader
    {...props}
    field={FIELD}
    palette={palette}
    stillTime={stillTime}
    uniforms={{
      tunnelCenter: center,
      tunnelFog: Math.max(0.1, fog),
      tunnelRings: Math.max(0.25, rings),
      tunnelShape: shape === "square" ? 1 : 0,
      tunnelSpokes: Math.min(32, Math.max(0, Math.round(spokes))),
      tunnelSway: Math.max(0, sway),
    }}
    fallback={
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: cssColor(palette[0]),
          backgroundImage: fallbackImage(palette, center, shape),
        }}
      />
    }
  />
);
