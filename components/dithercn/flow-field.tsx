"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

/**
 * How the wind is drawn. `streaks` shows only the travelling dashes,
 * `lines` also draws every streamline faintly underneath them.
 */
export type FlowFieldVariant = "streaks" | "lines";

export type FlowFieldProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** How the wind is drawn. Default `"streaks"`. */
  variant?: FlowFieldVariant;
  /** How tightly the streamlines pack. 1 is the default spacing; 2 packs twice as many in. */
  density?: number;
  /** Length of each streak's fading tail, as a share of the gap between streaks, 0.1 to 1. Default 0.55. */
  trail?: number;
  /** How much the wind meanders and curls into eddies, 0 (a straight, steady wind) to 2. Default 1. */
  turbulence?: number;
  /** Size of the swirls. Higher values pack more, smaller ones in. Default 1. */
  scale?: number;
  /** Direction the wind blows towards, in degrees as in CSS: 0 points up, 90 right. Default 70. */
  angle?: number;
  /** The brightest tone, 0 to 1. Lower it to sit text on top. Default 1. */
  intensity?: number;
};

const FLOW_PALETTE = [
  "--dither-paper",
  "color-mix(in oklch, var(--dither-ink) 40%, var(--dither-paper))",
  "--dither-ink",
] as const satisfies DitherPalette;

const FIELD = `
// The stream function. Its level sets are the streamlines of a flow with no
// sources or sinks: a steady wind along dir, plus slow swirls that drift
// downwind and change shape as they go.
float flowStream(vec2 p, vec2 dir, float t) {
  vec2 q = p * flowScale - dir * t * 0.05 + vec2(3.7, 1.9);
  q += 0.45 * vec2(snoise(q * 0.3 + vec2(0.0, t * 0.02)), snoise(q * 0.3 + vec2(t * 0.017, 6.1)));
  float swirl = 0.78 * snoise(q * 0.5) + 0.22 * snoise(q * 1.1 + vec2(5.2, -2.4));
  return dir.x * p.y - dir.y * p.x + swirl * flowTurbulence * 0.32 / flowScale;
}

// 1 on a line, 0 a cell or so away. offset and perCell are in line steps.
float flowLine(float offset, float perCell, float width) {
  float d = offset / perCell;
  return 1.0 - smoothstep(width * 0.5 - 0.5, width * 0.5 + 0.5, d);
}

float field(vec2 uv, vec2 res, float t) {
  // One unit is 100 cells, so the wind keeps its size in cells and a phone
  // shows a smaller piece of the same map.
  float cellUnit = 0.01;
  vec2 p = (uv - 0.5) * res * cellUnit;

  // The prevailing wind veers slowly back and forth.
  float a = flowAngle + 0.12 * sin(t * 0.031) + 0.05 * sin(t * 0.019 + 1.7);
  vec2 dir = vec2(cos(a), sin(a));

  float s = flowStream(p, dir, t);
  float sx = flowStream(p + vec2(cellUnit, 0.0), dir, t);
  float sy = flowStream(p + vec2(0.0, cellUnit), dir, t);
  vec2 grad = vec2(sx - s, sy - s) / cellUnit;

  // The wind is the gradient turned a quarter: fast where the lines bunch up.
  vec2 wind = vec2(grad.y, -grad.x);
  float windSpeed = length(wind);
  float facing = dot(wind / max(windSpeed, 1e-4), dir);

  float count = 9.0 * flowDensity;
  float v = s * count;
  float id = floor(v + 0.5);
  float offset = abs(v - id);
  // Floor the slope so lines stay thin where the wind stalls.
  float perCell = max(windSpeed, 0.5) * count * cellUnit;

  // Dashes run along each line at their own pace, with their own gaps. Some
  // slots stay empty so the streaks never line up across the lines.
  float seedA = hash21(vec2(id, 3.7));
  float seedB = hash21(vec2(id, 9.1));
  float phase = dot(p, dir) * 1.4 - t * 0.24 * mix(0.75, 1.3, seedA) + seedB * 7.0;
  float present = step(0.25, hash21(vec2(id, floor(phase))));
  // 0 at the end of the tail, 1 at the head, then a crisp front.
  float x = fract(phase);
  float tail = smoothstep(1.0 - flowTrail, 1.0, x);
  tail = pow(tail, 1.25);

  float headWidth = mix(0.8, 1.8, tail);
  float dash = flowLine(offset, perCell, headWidth) * tail * present;
  // Where a line turns across the wind, its dashes stretch out: let them fade.
  dash *= smoothstep(0.05, 0.4, abs(facing));
  // Fast wind is bright, still air dim.
  dash *= mix(0.55, 1.0, smoothstep(0.4, 1.3, windSpeed)) * mix(0.8, 1.0, seedB);

  float lines = flowVariant * flowLine(offset, perCell, 1.0) * flowBase;
  // Only cells close to a line can ink, so stalled air never blots.
  float guard = 1.0 - smoothstep(0.16, 0.26, offset);
  return max(dash, lines) * guard * flowIntensity;
}
`;

/** Line spacing in px at density 1, and the trail the dash tails are sized for. */
const FALLBACK_GAP = 32;
const DEFAULT_TRAIL = 0.55;

const px = (value: number) => `${Number(value.toFixed(2))}px`;

/**
 * Straight CSS streamlines along the wind, shown without WebGL: faint lines
 * for `lines`, and two interleaved sets of brighter copies cut into fading
 * dashes by masks of different lengths, so the dashes never line up.
 * `angle` is in the shader's convention, 0 right and 90 up; `density` and
 * `trail` arrive clamped, and set the line spacing and the tail lengths.
 */
const fallbackLayers = ({
  palette,
  angle,
  density,
  trail,
}: {
  palette: DitherPalette;
  angle: number;
  density: number;
  trail: number;
}) => {
  const mid = cssColor(palette[1]);
  const ink = cssColor(palette.at(-1) ?? palette[1]);
  const headColor = `color-mix(in oklab, ${ink} 70%, transparent)`;
  // Like the shader's line count, the spacing shrinks as density grows.
  const gap = FALLBACK_GAP / density;
  // CSS angles run clockwise from the top. The lines run along the wind,
  // so their gradient runs across it; the dash masks run along it.
  // Each dash set has a line every two gaps; an offset of one gap puts the
  // second set between the first.
  const across = (color: string, offset: number) =>
    `repeating-linear-gradient(${-angle}deg, transparent 0 ${px(offset)}, ${color} ${px(offset)} ${px(offset + 2)}, transparent ${px(offset + 2)} ${px(gap * 2)})`;
  // One fading dash per period: a tail ending in a crisp head. `tail` is
  // its length in px at the default trail, scaled like the shader's tail.
  const dashSet = ({
    offset,
    period,
    head,
    tail,
  }: {
    offset: number;
    period: number;
    head: number;
    tail: number;
  }) => {
    const length = (tail * trail) / DEFAULT_TRAIL;
    const mask = `repeating-linear-gradient(${90 - angle}deg, transparent 0 ${px(head - length)}, black ${head}px, transparent ${head + 1}px ${period}px)`;
    return {
      WebkitMaskImage: mask,
      backgroundImage: across(headColor, offset),
      maskImage: mask,
    };
  };
  return {
    dashes: [
      dashSet({ head: 150, offset: 0, period: 230, tail: 70 }),
      dashSet({ head: 260, offset: gap, period: 310, tail: 90 }),
    ],
    lines: `repeating-linear-gradient(${-angle}deg, transparent 0 ${px(gap)}, color-mix(in oklab, ${mid} 45%, transparent) ${px(gap)} ${px(gap + 2)})`,
  };
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * A wind map drawn as a dither: streamlines of a slowly turning, swirling
 * flow, with bright streaks that travel along them and leave fading tails.
 * Decorative and full-bleed: size it with `className`, usually
 * `absolute inset-0`.
 */
export const FlowField = ({
  variant = "streaks",
  density = 1,
  trail = 0.55,
  turbulence = 1,
  scale = 1,
  angle = 70,
  intensity = 1,
  palette = FLOW_PALETTE,
  matrix = "bayer8",
  stillTime = 8,
  ...props
}: FlowFieldProps) => {
  // The internals work in math degrees, 0 right and 90 up.
  const windAngle = 90 - angle;
  const flowDensity = clamp(density, 0.25, 4);
  const flowTrail = clamp(trail, 0.1, 1);
  const layers = fallbackLayers({
    angle: windAngle,
    density: flowDensity,
    palette,
    trail: flowTrail,
  });
  // Streamlines take the first colour after the paper, exactly, so they
  // come out solid; with only paper and ink they sit at a soft 40%.
  const base = palette.length > 2 ? 1 / (palette.length - 1) : 0.4;

  return (
    <DitherShader
      {...props}
      field={FIELD}
      palette={palette}
      matrix={matrix}
      stillTime={stillTime}
      uniforms={{
        flowAngle: (windAngle * Math.PI) / 180,
        flowBase: base,
        flowDensity,
        flowIntensity: clamp(intensity, 0, 1),
        flowScale: clamp(scale, 0.2, 4),
        flowTrail,
        flowTurbulence: clamp(turbulence, 0, 2),
        flowVariant: variant === "lines" ? 1 : 0,
      }}
      fallback={
        <div
          className="absolute inset-0"
          style={{ backgroundColor: cssColor(palette[0]) }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: variant === "lines" ? layers.lines : undefined,
              opacity: clamp(intensity, 0, 1),
            }}
          >
            <div className="absolute inset-0" style={layers.dashes[0]} />
            <div className="absolute inset-0" style={layers.dashes[1]} />
          </div>
        </div>
      }
    />
  );
};
