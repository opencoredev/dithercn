"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

/** A point relative to the box: x from the left, y from the top. May lie outside 0 to 1. */
export type BeamsOrigin = readonly [number, number];

export type BeamsProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /**
   * Where the light comes from, as fractions of the box from the top left.
   * Put it outside the box for a light just out of frame, or far away for
   * near-parallel rays from an edge. Default `[0.18, -0.12]`.
   */
  origin?: BeamsOrigin;
  /** Direction the light points, in degrees as in CSS: 180 is down. Default 160. */
  angle?: number;
  /** Width of the cone of light in degrees. Default 80. */
  spread?: number;
  /** How many separate rays, roughly. Default 9. */
  rays?: number;
  /** How far the rays sweep back and forth, in degrees. 0 holds them still. Default 6. */
  sweep?: number;
  /** How far the light reaches from where it enters the box, as a share of the box diagonal. Default 1. */
  reach?: number;
};

const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 o = vec2(beamOrigin.x * aspect, 1.0 - beamOrigin.y);
  vec2 d = p - o;
  float dist = length(d);
  // Light fades from where it enters the box, so a far origin still lights the near edge.
  vec2 box = vec2(aspect, 1.0) * 0.5;
  float entry = length(max(abs(o - box) - box, 0.0));
  float travelled = max(dist - entry, 0.0);

  // Angle from the cone's axis, in radians. CSS angles: 0 is up, clockwise.
  float sway = radians(beamSweep) * sin(t * 0.11);
  float axis = radians(beamAngle) + sway;
  float a = atan(d.x, d.y) - axis;
  a = mod(a + 3.14159265, 6.28318531) - 3.14159265;

  float halfWidth = radians(beamSpread) * 0.5;
  float cone = smoothstep(halfWidth, 0.0, abs(a));
  cone = sqrt(cone);

  // Rays: noise around the origin, two octaves, sliding slowly sideways.
  float k = beamRays / max(halfWidth, 0.02);
  float r1 = 0.5 + 0.5 * snoise(vec2(a * k * 0.5, t * 0.05));
  float r2 = 0.5 + 0.5 * snoise(vec2(a * k * 1.4 + 7.0, t * 0.08 + 3.0));
  float rays = 0.12 + 1.1 * pow(r1, 2.0) + 0.25 * pow(r2, 3.0);
  // Dust drifting through the light breaks the rays up along their length.
  float dust = 0.88 + 0.12 * fbm(vec2(a * k * 0.3, travelled * 3.0 - t * 0.06));

  float reach = length(vec2(aspect, 1.0)) * beamReach;
  float fall = exp(-travelled / reach * 2.4);
  float core = exp(-travelled * 8.0) * 0.35;
  return clamp(cone * (rays * dust * fall * 1.3 + core), 0.0, 1.0);
}
`;

/** A soft CSS cone of light, shown without WebGL. */
const fallbackImage = ({
  palette,
  origin,
  angle,
  spread,
}: {
  palette: DitherPalette;
  origin: BeamsOrigin;
  angle: number;
  spread: number;
}) => {
  const ink = cssColor(palette.at(-1) ?? palette[1]);
  const at = `${(origin[0] * 100).toFixed(1)}% ${(origin[1] * 100).toFixed(1)}%`;
  const from = angle - spread / 2;
  return `conic-gradient(from ${from}deg at ${at}, transparent, color-mix(in oklab, ${ink} 30%, transparent) ${spread / 2}deg, transparent ${spread}deg)`;
};

/**
 * God rays: shafts of light from a point or an edge that sweep slowly and
 * fade with distance. Decorative and full-bleed: size it with `className`,
 * usually `absolute inset-0`.
 */
export const Beams = ({
  origin = [0.18, -0.12],
  angle = 160,
  spread = 80,
  rays = 9,
  sweep = 6,
  reach = 1,
  palette = ["--dither-paper", "--dither-ink"],
  stillTime = 4,
  ...props
}: BeamsProps) => (
  <DitherShader
    {...props}
    field={FIELD}
    palette={palette}
    stillTime={stillTime}
    uniforms={{
      beamAngle: angle,
      beamOrigin: origin,
      beamRays: Math.max(1, rays),
      beamReach: Math.max(0.05, reach),
      beamSpread: Math.min(359, Math.max(1, spread)),
      beamSweep: sweep,
    }}
    fallback={
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: cssColor(palette[0]),
          backgroundImage: fallbackImage({ angle, origin, palette, spread }),
        }}
      />
    }
  />
);
