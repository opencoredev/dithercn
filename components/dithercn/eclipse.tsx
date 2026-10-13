"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherColor, DitherShaderProps } from "@/lib/dither";

/** A point in the box: x from the left, y from the top, both 0 to 1. */
export type EclipsePoint = readonly [number, number];

export type EclipseProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback" | "palette"
> & {
  /** Centre of the disc. Default `[0.5, 0.5]`. */
  center?: EclipsePoint;
  /** Radius of the disc as a share of the box height. Default 0.24. */
  size?: number;
  /** How far the corona reaches past the rim, 0 to 1. Default 0.5. */
  corona?: number;
  /** Where the rim is brightest, in degrees as in CSS: 0 is the top. Default 315. */
  light?: number;
  /** How much the glow breathes, 0 (steady) to 1. Default 0.5. */
  pulse?: number;
  /** Colour of the rim and corona. Default `"--dither-ink"`. */
  rimColor?: DitherColor;
  /** Colour of the sky and the disc. Default `"--dither-paper"`. */
  skyColor?: DitherColor;
};

const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 c = vec2(eclipseCenter.x * aspect, 1.0 - eclipseCenter.y);
  vec2 d = p - c;
  float r = length(d);
  float e = r - eclipseSize;
  if (e < 0.0) {
    return 0.0;
  }

  // Direction around the disc as a point on the unit circle, so the noise wraps.
  vec2 around = d / max(r, 0.0001);
  float a = atan(d.x, d.y);
  float facing = 0.5 + 0.5 * cos(a - radians(eclipseLight));

  float breathe = 1.0 + eclipsePulse * 0.12 * sin(t * 0.6);
  float reach = eclipseSize * (0.1 + 0.5 * eclipseCorona) * breathe;

  // A smooth halo whose strength wavers slowly around the rim.
  float streak = fbm(around * 2.2 + vec2(t * 0.02, -t * 0.015));
  float halo = exp(-e / reach) * (1.0 - smoothstep(reach, reach * 3.2, e)) * (0.7 + 0.6 * streak);
  // A thin rim, brightest on the lit side: the crescent of an eclipse.
  float rim = exp(-e / (eclipseSize * 0.03));
  float glow = halo * (0.3 + 0.6 * facing) + rim * (0.3 + pow(facing, 1.5));
  return clamp(glow * breathe, 0.0, 1.0);
}
`;

const CENTRE: EclipsePoint = [0.5, 0.5];

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

/** A CSS disc inside a soft ring, shown without WebGL. */
const fallbackImage = ({
  center,
  size,
  rimColor,
  skyColor,
}: {
  center: EclipsePoint;
  size: number;
  rimColor: DitherColor;
  skyColor: DitherColor;
}) => {
  const rim = cssColor(rimColor);
  const sky = cssColor(skyColor);
  const at = `${percent(center[0])} ${percent(center[1])}`;
  const radius = `${(size * 100).toFixed(1)}cqh`;
  return `radial-gradient(circle at ${at}, ${sky} ${radius}, ${rim} calc(${radius} + 1px), color-mix(in oklab, ${rim} 25%, transparent) calc(${radius} * 1.15), transparent calc(${radius} * 1.6)), linear-gradient(${sky}, ${sky})`;
};

/**
 * An eclipse: a dark disc with a glowing rim and a corona that streams
 * outwards and breathes slowly. Decorative and full-bleed: size it with
 * `className`, usually `absolute inset-0`.
 */
export const Eclipse = ({
  center = CENTRE,
  size = 0.24,
  corona = 0.5,
  light = 315,
  pulse = 0.5,
  rimColor = "--dither-ink",
  skyColor = "--dither-paper",
  stillTime = 5,
  style,
  ...props
}: EclipseProps) => (
  <DitherShader
    {...props}
    field={FIELD}
    palette={[skyColor, rimColor]}
    stillTime={stillTime}
    style={{ containerType: "size", ...style }}
    uniforms={{
      eclipseCenter: center,
      eclipseCorona: Math.min(1, Math.max(0, corona)),
      eclipseLight: light,
      eclipsePulse: Math.min(1, Math.max(0, pulse)),
      eclipseSize: Math.max(0.01, size),
    }}
    fallback={
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: fallbackImage({ center, rimColor, size, skyColor }),
        }}
      />
    }
  />
);
