"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

/** A point in the box: x from the left, y from the top, both 0 to 1. */
export type HalftonePoint = readonly [number, number];

interface NoiseSource {
  /** A slow, warped noise field that drifts across the box. */
  source?: "noise";
  center?: never;
  radius?: never;
  direction?: never;
}

interface RadialSource {
  /** Dots are largest at `center` and shrink towards the corners. */
  source: "radial";
  /** Where the dots are largest. Default `[0.5, 0.5]`. */
  center?: HalftonePoint;
  /** Where the dots run out. 1 reaches the farthest corner. Default 1. */
  radius?: number;
  direction?: never;
}

interface LinearSource {
  /** Dots grow across the box in one direction. */
  source: "linear";
  /** Direction the dots grow towards, in degrees as in CSS: 0 is up. Default 0. */
  direction?: number;
  center?: never;
  radius?: never;
}

export type HalftoneSource = NoiseSource | RadialSource | LinearSource;

export type HalftoneProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback" | "matrix"
> &
  HalftoneSource & {
    /** Distance between dot centres, in cells. Default 12. */
    spacing?: number;
    /** Rotation of the dot grid in degrees. Print uses 45 for black. Default 45. */
    rotation?: number;
    /** Size of one cell in CSS pixels. Default 1, finer than other backgrounds so dots stay round. */
    cell?: number;
    /** Size of the noise features. Noise source only. Default 1. */
    scale?: number;
    /** Size of the largest dot, 0 to 1. At 1 neighbouring dots just touch. Default 1. */
    intensity?: number;
  };

const FIELD = `
float halftoneSource(vec2 uv, float aspect, float t) {
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  if (halftoneMode < 0.5) {
    vec2 q = p * 1.15 * halftoneScale;
    vec2 w = vec2(
      fbm(q + vec2(t * 0.035, 0.0)),
      fbm(q + vec2(5.2, 1.3) - vec2(0.0, t * 0.03))
    );
    return 0.9 * pow(smoothstep(0.34, 0.86, fbm(q + 0.9 * w)), 1.5);
  }
  float drift = (fbm(p * 1.5 + vec2(t * 0.04, -t * 0.03)) - 0.5) * 0.18;
  if (halftoneMode < 1.5) {
    vec2 c = vec2((halftoneCenter.x - 0.5) * aspect, 0.5 - halftoneCenter.y);
    vec2 corner = vec2(aspect * 0.5 + abs(c.x), 0.5 + abs(c.y));
    return clamp(1.0 - length(p - c) / (length(corner) * halftoneRadius) + drift, 0.0, 1.0);
  }
  float a = radians(halftoneDirection);
  vec2 dir = vec2(sin(a), cos(a));
  float extent = abs(dir.x) * aspect * 0.5 + abs(dir.y) * 0.5;
  return clamp(dot(p, dir) / (2.0 * extent) + 0.5 + drift, 0.0, 1.0);
}

float field(vec2 uv, vec2 res, float t) {
  float a = radians(halftoneRotation);
  mat2 toGrid = mat2(cos(a), -sin(a), sin(a), cos(a));
  mat2 fromGrid = mat2(cos(a), sin(a), -sin(a), cos(a));
  vec2 q = toGrid * (uv * res) / halftoneSpacing;
  vec2 id = floor(q) + 0.5;
  vec2 local = q - id;

  // Every dot takes one value, sampled at its centre, as in print.
  vec2 centre = fromGrid * (id * halftoneSpacing) / res;
  float value = halftoneSource(centre, res.x / res.y, t);
  float radius = sqrt(value) * 0.58 * halftoneIntensity;
  float inside = step(length(local), radius) * step(0.02, value);

  // In a palette, bigger dots take later colours.
  float tone = ceil(value * halftoneSteps) / halftoneSteps;
  return inside * tone;
}
`;

const MODES = { linear: 2, noise: 0, radial: 1 } as const;
const CENTRE: HalftonePoint = [0.5, 0.5];

/** CSS dots on a rotated grid, shown without WebGL. */
const fallbackStyle = ({
  palette,
  pitch,
  rotation,
}: {
  palette: DitherPalette;
  pitch: number;
  rotation: number;
}) => {
  const ink = cssColor(palette.at(-1) ?? palette[1]);
  const size = `${pitch}px`;
  return {
    backgroundImage: `radial-gradient(circle, ${ink} 28%, transparent 30%)`,
    backgroundSize: `${size} ${size}`,
    inset: "-50%",
    maskImage: "radial-gradient(closest-side, #000, transparent)",
    transform: `rotate(${rotation}deg)`,
  };
};

/**
 * A print-style halftone: round dots on a rotated grid that grow with the
 * value underneath, from slow noise, a radial spot or a linear ramp. Not an
 * ordered dither; dots are solid. Decorative and full-bleed: size it with
 * `className`, usually `absolute inset-0`.
 */
export const Halftone = (props: HalftoneProps) => {
  const {
    spacing = 12,
    cell = 1,
    rotation = 45,
    scale = 1,
    intensity = 1,
    palette = ["--dither-paper", "--dither-ink"],
    levels,
    source = "noise",
    center = CENTRE,
    radius = 1,
    direction = 0,
    ...shaderProps
  } = props;
  const steps = palette.length - 1;

  return (
    <DitherShader
      {...shaderProps}
      field={FIELD}
      cell={cell}
      palette={palette}
      levels={levels ?? Math.min(256, steps * 16 + 1)}
      uniforms={{
        halftoneCenter: center,
        halftoneDirection: direction,
        halftoneIntensity: Math.min(1, Math.max(0, intensity)),
        halftoneMode: MODES[source],
        halftoneRadius: Math.max(0.01, radius),
        halftoneRotation: rotation,
        halftoneScale: Math.max(0.05, scale),
        halftoneSpacing: Math.max(2, spacing),
        halftoneSteps: steps,
      }}
      fallback={
        <div
          className="absolute"
          style={fallbackStyle({ palette, pitch: cell * spacing, rotation })}
        />
      }
    />
  );
};
