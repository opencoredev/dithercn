"use client";

import { useEffect, useState } from "react";

import { cssColor, DitherShader } from "@/lib/dither";
import type {
  DitherColor,
  DitherPalette,
  DitherShaderProps,
} from "@/lib/dither";

/** A point in the box: x from the left, y from the top, both 0 to 1. */
export type HalftonePoint = readonly [number, number];

interface NoiseSource {
  /** Soft, slowly drifting clouds. */
  source?: "noise";
  center?: never;
  radius?: never;
  direction?: never;
}

interface RadialSource {
  /** Dots are largest at `center` and shrink away from it. */
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

/** Two or three inks, printed as separate screens that overlap like CMYK. */
export type HalftoneChannels =
  | readonly [DitherColor, DitherColor]
  | readonly [DitherColor, DitherColor, DitherColor];

interface MonoInk {
  /** Colour of the dots: a palette name such as `"blue"`, a CSS variable name, or any CSS colour. Default `"ink"`. */
  color?: DitherColor;
  channels?: never;
}

interface MultiInk {
  /**
   * Two or three inks, each on its own screen turned 30° from the last.
   * Where dots overlap, their colours mix.
   */
  channels: HalftoneChannels;
  color?: never;
}

export type HalftoneInk = MonoInk | MultiInk;

export type HalftoneProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback" | "matrix" | "palette" | "levels"
> &
  HalftoneSource &
  HalftoneInk & {
    /** Colour behind the dots. `"transparent"` lays the screen over whatever is underneath. Default `"--dither-paper"`. */
    background?: DitherColor;
    /** Distance between dot centres in CSS pixels. Default 10. */
    size?: number;
    /** Screen angle in degrees. Extra channels add 30° each. Default 45. */
    angle?: number;
    /** Size of the noise clouds. Noise source only. Default 1. */
    scale?: number;
    /** Size of the largest dot, 0 to 1. At 1 the biggest dots just touch. Default 0.95. */
    intensity?: number;
    /** How fast the screen slides along its angle, so dots swell and shrink as they cross the source. 0 holds it still. Default 1. */
    drift?: number;
    /** Size of one rendered pixel in CSS pixels. Default: one device pixel, so dot edges stay crisp. Larger cells give blockier dots. */
    cell?: number;
  };

const FIELD = `
float halftoneBayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}

// 4x4 ordered threshold, so dot edges dither instead of stair-stepping.
float halftoneBayer(vec2 a) {
  return halftoneBayer2(0.5 * a) * 0.25 + halftoneBayer2(a) + 0.03125;
}

float halftoneSource(vec2 uv, float aspect, float t, float channel) {
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  vec2 phase = vec2(3.7, 1.9) * channel;
  if (halftoneMode < 0.5) {
    // Two broad octaves only: wide, soft swells give the dots room to grade.
    vec2 q = p * 1.1 * halftoneScale + phase;
    float n = snoise(q + vec2(t * 0.05, -t * 0.03)) * 0.75
      + snoise(q * 2.1 + vec2(-t * 0.04, t * 0.06) + 7.3) * 0.25;
    return smoothstep(-0.25, 0.85, n);
  }
  float drift = (fbm(p * 1.4 + phase + vec2(t * 0.04, -t * 0.03)) - 0.5) * 0.22;
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

// 1 when this pixel is inked by the screen of one channel.
float halftoneScreen(vec2 px, vec2 res, float t, float channel) {
  float a = radians(halftoneAngle + 30.0 * channel);
  mat2 toGrid = mat2(cos(a), -sin(a), sin(a), cos(a));
  mat2 fromGrid = mat2(cos(a), sin(a), -sin(a), cos(a));
  vec2 slide = fromGrid * vec2(t * halftoneDrift * 4.0, 0.0);
  vec2 q = toGrid * (px + slide) / halftonePitch;
  vec2 id = floor(q) + 0.5;
  vec2 local = q - id;

  // Each dot takes one value, sampled at its centre, as in print.
  vec2 centre = (fromGrid * (id * halftonePitch) - slide) / res;
  float value = halftoneSource(centre, res.x / res.y, t, channel);
  float radius = 0.5 * sqrt(value) * halftoneIntensity;
  float cover = clamp((radius - length(local)) * halftonePitch + 0.5, 0.0, 1.0);
  return step(halftoneBayer(px + vec2(2.0, 1.0) * channel), cover);
}

float field(vec2 uv, vec2 res, float t) {
  vec2 px = uv * res - 0.5;
  float index = halftoneScreen(px, res, t, 0.0);
  if (halftoneChannels > 1.5) {
    index += 2.0 * halftoneScreen(px, res, t, 1.0);
  }
  if (halftoneChannels > 2.5) {
    index += 4.0 * halftoneScreen(px, res, t, 2.0);
  }
  // Pick a palette entry exactly: the palette lists every overlap.
  return index / (pow(2.0, halftoneChannels) - 1.0);
}
`;

const MODES = { linear: 2, noise: 0, radial: 1 } as const;
const CENTRE: HalftonePoint = [0.5, 0.5];

const mix = (a: DitherColor, b: DitherColor, share = 50) =>
  `color-mix(in oklch, ${cssColor(a)} ${share}%, ${cssColor(b)})`;

/**
 * Background, then every combination of inks in bit order: one entry per
 * overlap, so the shader can pick a colour without blending.
 */
const screenPalette = (
  background: DitherColor,
  inks: readonly DitherColor[]
): DitherPalette => {
  const [a = "ink", b, c] = inks;
  if (b === undefined) {
    return [background, a];
  }
  if (c === undefined) {
    return [background, a, b, mix(a, b)];
  }
  return [
    background,
    a,
    b,
    mix(a, b),
    c,
    mix(a, c),
    mix(b, c),
    mix(mix(a, b), c, 67),
  ];
};

/** CSS dot screens, one per ink, shown without WebGL. */
const Fallback = ({
  background,
  inks,
  pitch,
  angle,
}: {
  background: DitherColor;
  inks: readonly DitherColor[];
  pitch: number;
  angle: number;
}) => (
  <div
    className="absolute inset-0 overflow-hidden"
    style={{ backgroundColor: cssColor(background) }}
  >
    {inks.map((ink, index) => (
      <div
        key={index}
        className="absolute -inset-1/2"
        style={{
          backgroundImage: `radial-gradient(circle, ${cssColor(ink)} 30%, transparent 32%)`,
          backgroundSize: `${pitch}px ${pitch}px`,
          maskImage: "radial-gradient(closest-side, #000, transparent)",
          mixBlendMode: index > 0 ? "screen" : undefined,
          transform: `rotate(${angle + 30 * index}deg)`,
        }}
      />
    ))}
  </div>
);

/** The device pixel ratio, kept current when the window moves between screens or zooms. */
const useDevicePixelRatio = () => {
  const [ratio, setRatio] = useState(1);
  useEffect(() => {
    const update = () => setRatio(window.devicePixelRatio || 1);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return ratio;
};

/**
 * A print halftone: round dots on a rotated screen that grow smoothly with
 * a noise, radial or linear source, in one ink or two to three overlapping
 * channels like CMYK. The screen slides slowly so dots swell and shrink
 * as they travel. Decorative and full-bleed: size it with `className`,
 * usually `absolute inset-0`.
 */
export const Halftone = (props: HalftoneProps) => {
  const {
    size = 10,
    cell,
    angle = 45,
    scale = 1,
    intensity = 0.9,
    drift = 1,
    color = "ink",
    channels,
    background = "--dither-paper",
    source = "noise",
    center = CENTRE,
    radius = 1,
    direction = 0,
    ...shaderProps
  } = props;
  const inks = channels ?? [color];
  const palette = screenPalette(background, inks);
  const pitch = Math.max(3, size);
  const ratio = useDevicePixelRatio();
  const cssCell = cell ?? 1 / ratio;
  // DitherShader snaps cells to whole device pixels; measure the screen in those.
  const snapped = Math.max(1, Math.round(cssCell * ratio)) / ratio;

  return (
    <DitherShader
      {...shaderProps}
      field={FIELD}
      cell={cssCell}
      palette={palette}
      levels={palette.length}
      uniforms={{
        halftoneAngle: angle,
        halftoneCenter: center,
        halftoneChannels: inks.length,
        halftoneDirection: direction,
        halftoneDrift: drift,
        halftoneIntensity: Math.min(1, Math.max(0, intensity)),
        halftoneMode: MODES[source],
        halftonePitch: pitch / snapped,
        halftoneRadius: Math.max(0.01, radius),
        halftoneScale: Math.max(0.05, scale),
      }}
      fallback={
        <Fallback
          background={background}
          inks={inks}
          pitch={pitch}
          angle={angle}
        />
      }
    />
  );
};
