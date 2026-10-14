"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

export type RetroGridProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** Height of the horizon, 0 (bottom) to 1 (top). Default 0.42. */
  horizon?: number;
  /** Size of the sun as a share of the box height. 0 hides it. Default 0.4. */
  sun?: number;
  /** How many grid squares across the front of the floor in a 16:10 box. Narrower boxes show fewer. Default 12. */
  columns?: number;
};

const RETRO_GRID_PALETTE = [
  "--dither-paper",
  "color-mix(in oklch, var(--dither-ink) 30%, var(--dither-paper))",
  "color-mix(in oklch, var(--dither-ink) 65%, var(--dither-paper))",
  "--dither-ink",
] as const satisfies DitherPalette;

const FIELD = `
// A grid line at every whole value of v, about one cell wide whatever the
// perspective. Lines closer than a couple of cells fade out instead of
// turning into moire.
float retroLine(float v, float vx, float vy) {
  float offset = abs(fract(v + 0.5) - 0.5);
  float perCell = max(length(vec2(vx - v, vy - v)), 1e-4);
  float line = 1.0 - smoothstep(0.35, 1.1, offset / perCell);
  return line * (1.0 - smoothstep(0.2, 0.45, perCell));
}

vec2 retroFloor(vec2 uv, float aspect, float t) {
  float below = max(retroHorizon - uv.y, 1e-4) / max(retroHorizon, 1e-3);
  float depth = 1.0 / below;
  // Squares keep their size against the box height, so a narrow box shows
  // fewer columns rather than thinner ones. Front squares come out a little
  // foreshortened, as seen from a low camera.
  float across = (uv.x - 0.5) * aspect * depth * retroColumns / 1.6;
  float rows = 1.5 * retroHorizon * retroColumns / 1.6;
  return vec2(across, depth * rows + t * 0.35);
}

float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 cellStep = 1.0 / res;
  float tone = 0.0;

  if (uv.y < retroHorizon) {
    vec2 g = retroFloor(uv, aspect, t);
    vec2 gx = retroFloor(uv + vec2(cellStep.x, 0.0), aspect, t);
    vec2 gy = retroFloor(uv + vec2(0.0, cellStep.y), aspect, t);
    float lines = max(retroLine(g.x, gx.x, gy.x), retroLine(g.y, gx.y, gy.y));
    float near = (retroHorizon - uv.y) / max(retroHorizon, 1e-3);
    // Haze at the horizon, the sun's reflection, and lines that brighten towards you.
    float haze = exp(-near * 14.0) * 0.4;
    float glare = exp(-pow((uv.x - 0.5) * aspect * 2.6, 2.0)) * exp(-near * 5.0) * 0.25 * step(0.001, retroSun);
    tone = max(lines * mix(0.6, 1.0, smoothstep(0.0, 0.6, near)), haze + glare);
    tone = max(tone, (1.0 - smoothstep(0.0, 1.6, (retroHorizon - uv.y) * res.y)) * 0.95);
    return clamp(tone, 0.0, 1.0);
  }

  float above = uv.y - retroHorizon;
  float sky = exp(-above * 28.0) * 0.3;
  tone = sky;
  if (retroSun > 0.001) {
    float r = retroSun * 0.5;
    vec2 c = vec2((uv.x - 0.5) * aspect, uv.y - (retroHorizon + r * 0.2));
    float dist = length(c);
    float disc = 1.0 - smoothstep(r - 1.2 / res.y, r, dist);
    // Bright at the top, deeper towards the horizon, so the dither shows inside.
    float body = mix(0.62, 1.0, smoothstep(-r, r, c.y));
    // Slits through the lower half that thicken towards the horizon and drift down.
    float k = clamp((r * 0.6 - c.y) / (r * 0.85), 0.0, 1.0);
    float bands = fract(c.y / r * 6.0 + t * 0.08);
    float cut = step(bands, k * 0.6) * step(0.0001, k);
    float glow = exp(-max(dist - r, 0.0) * 9.0 / max(r * 2.0, 0.2)) * 0.4;
    tone = max(tone, max(disc * body * (1.0 - cut), glow * (1.0 - disc)));
  }
  return clamp(tone, 0.0, 1.0);
}
`;

/** A horizon, a sun and a flat grid in CSS, shown without WebGL. */
const fallbackImage = (
  palette: DitherPalette,
  horizon: number,
  sun: number
) => {
  const ink = cssColor(palette.at(-1) ?? palette[1]);
  const glow = cssColor(palette.at(-2) ?? palette[1]);
  const line = `${((1 - horizon) * 100).toFixed(1)}%`;
  const layers = [
    `linear-gradient(to bottom, transparent calc(${line} - 1px), ${ink} calc(${line} - 1px) ${line}, transparent ${line})`,
    `linear-gradient(to bottom, transparent ${line}, color-mix(in oklab, ${ink} 18%, transparent) 100%)`,
  ];
  if (sun > 0) {
    layers.push(
      `radial-gradient(circle ${(sun * 50).toFixed(1)}cqh at 50% ${line}, color-mix(in oklab, ${glow} 70%, transparent) 70%, transparent 100%)`
    );
  }
  return layers.join(", ");
};

/**
 * A perspective grid floor scrolling towards a horizon under a striped,
 * glowing sun, as on an eighties record sleeve. Decorative and full-bleed:
 * size it with `className`, usually `absolute inset-0`.
 */
export const RetroGrid = ({
  horizon = 0.42,
  sun = 0.4,
  columns = 12,
  palette = RETRO_GRID_PALETTE,
  stillTime = 3,
  ...props
}: RetroGridProps) => (
  <DitherShader
    {...props}
    field={FIELD}
    palette={palette}
    stillTime={stillTime}
    uniforms={{
      retroColumns: Math.max(2, columns),
      retroHorizon: Math.min(0.95, Math.max(0.05, horizon)),
      retroSun: Math.min(1, Math.max(0, sun)),
    }}
    fallback={
      <div
        className="absolute inset-0 [container-type:size]"
        style={{
          backgroundColor: cssColor(palette[0]),
          backgroundImage: fallbackImage(palette, horizon, sun),
        }}
      />
    }
  />
);
