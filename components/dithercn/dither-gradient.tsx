"use client";

import { cssColor, DEFAULT_PALETTE, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

/** A point in the box: x from the left, y from the top, both 0 to 1. */
export type GradientPoint = readonly [number, number];

interface LinearGradient {
  mode?: "linear";
  /** Direction in degrees, as in CSS: 0 points up, 90 right. Default 180. */
  angle?: number;
  center?: never;
  radius?: never;
}

interface RadialGradient {
  mode: "radial";
  /** Centre of the circle. Default `[0.5, 0.5]`. */
  center?: GradientPoint;
  /** 1 reaches the farthest corner. Default 1. */
  radius?: number;
  angle?: never;
}

interface ConicGradient {
  mode: "conic";
  /** Centre of the sweep. Default `[0.5, 0.5]`. */
  center?: GradientPoint;
  /** Where the sweep starts, in degrees from the top, clockwise. Default 0. */
  angle?: number;
  radius?: never;
}

export type GradientShape = LinearGradient | RadialGradient | ConicGradient;

export type DitherGradientProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> &
  GradientShape & {
    /** Tone at the start of the gradient, 0 (paper) to 1 (ink). Default 0. */
    from?: number;
    /** Tone at the end of the gradient. Default 1. */
    to?: number;
    /** How far a slow noise drift bends the bands, 0 to 1. Default 0.12. */
    noise?: number;
  };

const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  vec2 c = vec2((gradientCenter.x - 0.5) * aspect, 0.5 - gradientCenter.y);
  float a = radians(gradientAngle);
  float s;
  if (gradientMode < 0.5) {
    vec2 dir = vec2(sin(a), cos(a));
    float extent = abs(dir.x) * aspect * 0.5 + abs(dir.y) * 0.5;
    s = dot(p, dir) / (2.0 * extent) + 0.5;
  } else if (gradientMode < 1.5) {
    vec2 corner = vec2(aspect * 0.5 + abs(c.x), 0.5 + abs(c.y));
    s = length(p - c) / (length(corner) * gradientRadius);
  } else {
    vec2 d = p - c;
    s = fract((atan(d.x, d.y) - a) / 6.28318530718);
  }
  float drift = fbm(p * 1.8 + vec2(t * 0.045, -t * 0.03)) - 0.5;
  s = clamp(s + drift * gradientNoise, 0.0, 1.0);
  return mix(gradientFrom, gradientTo, s);
}
`;

const MODES = { conic: 2, linear: 0, radial: 1 } as const;
const CENTRE: GradientPoint = [0.5, 0.5];

interface ResolvedShape {
  mode: keyof typeof MODES;
  angle: number;
  center: GradientPoint;
  radius: number;
}

const resolveShape = (shape: GradientShape): ResolvedShape => {
  switch (shape.mode) {
    case undefined:
    case "linear": {
      return {
        angle: shape.angle ?? 180,
        center: CENTRE,
        mode: "linear",
        radius: 1,
      };
    }
    case "radial": {
      return {
        angle: 0,
        center: shape.center ?? CENTRE,
        mode: "radial",
        radius: Math.max(0.01, shape.radius ?? 1),
      };
    }
    case "conic": {
      return {
        angle: shape.angle ?? 0,
        center: shape.center ?? CENTRE,
        mode: "conic",
        radius: 1,
      };
    }
    default: {
      const exhaustive: never = shape;
      return exhaustive;
    }
  }
};

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

/** A smooth CSS gradient with the same shape and colours, shown without WebGL. */
const fallbackImage = (
  { mode, angle, center, radius }: ResolvedShape,
  palette: DitherPalette,
  from: number,
  to: number
) => {
  const span = to - from;
  // Radial stops scale with the radius; the others span the whole box.
  const scale = mode === "radial" ? radius : 1;
  const stops = palette
    .map((color, index) => {
      const tone = index / (palette.length - 1);
      const at = span === 0 ? 0 : (tone - from) / span;
      return `${cssColor(color)} ${percent(at * scale)}`;
    })
    .join(", ");
  const at = `${percent(center[0])} ${percent(center[1])}`;
  switch (mode) {
    case "linear": {
      return `linear-gradient(${angle}deg, ${stops})`;
    }
    case "radial": {
      return `radial-gradient(circle farthest-corner at ${at}, ${stops})`;
    }
    case "conic": {
      return `conic-gradient(from ${angle}deg at ${at}, ${stops})`;
    }
    default: {
      const exhaustive: never = mode;
      return exhaustive;
    }
  }
};

/**
 * A dithered gradient: linear, radial or conic, from paper to ink (or
 * through a palette), with an optional slow noise drift. Decorative and
 * full-bleed: size it with `className`, usually `absolute inset-0`.
 */
export const DitherGradient = (props: DitherGradientProps) => {
  const {
    from = 0,
    to = 1,
    noise = 0.12,
    palette = DEFAULT_PALETTE,
    mode: _mode,
    angle: _angle,
    center: _center,
    radius: _radius,
    ...shaderProps
  } = props;
  const shape = resolveShape(props);

  return (
    <DitherShader
      {...shaderProps}
      field={FIELD}
      palette={palette}
      uniforms={{
        gradientAngle: shape.angle,
        gradientCenter: shape.center,
        gradientFrom: from,
        gradientMode: MODES[shape.mode],
        gradientNoise: noise,
        gradientRadius: shape.radius,
        gradientTo: to,
      }}
      fallback={
        <div
          className="absolute inset-0"
          style={{ backgroundImage: fallbackImage(shape, palette, from, to) }}
        />
      }
    />
  );
};
