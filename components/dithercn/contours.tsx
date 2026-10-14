"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

export type ContoursProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** How many contour lines from the lowest ground to the highest, 4 to 32. Default 14. */
  lines?: number;
  /** Size of the hills. Higher values pack more of them in. Default 1. */
  scale?: number;
  /** Every how many lines one is drawn heavier, as on a survey map. 0 draws them all the same. Default 5. */
  index?: number;
  /** How strongly the slopes facing away from the light are shaded, 0 to 1. Default 0.5. */
  relief?: number;
};

const CONTOURS_PALETTE = [
  "--dither-paper",
  "color-mix(in oklch, var(--dither-ink) 40%, var(--dither-paper))",
  "--dither-ink",
] as const satisfies DitherPalette;

const FIELD = `
float contoursHeight(vec2 p, float t) {
  // Low-frequency noise only, so lines stay unbroken; detail comes from the warp.
  vec2 q = p + vec2(4.3 + t * 0.008, 2.9 + t * 0.003);
  q += 0.3 * vec2(snoise(q * 0.45 + vec2(1.7, t * 0.008)), snoise(q * 0.45 + vec2(8.3, -t * 0.006)));
  return 0.5 + 0.34 * snoise(q * 0.85) + 0.14 * snoise(q * 1.9 + 4.1);
}

float contoursLine(float h, float hx, float hy, float count, float width) {
  float v = h * count;
  float offset = abs(fract(v + 0.5) - 0.5);
  float perCell = max(length(vec2(hx - h, hy - h)) * count, 1e-4);
  float d = offset / perCell;
  float line = 1.0 - smoothstep(width * 0.5 - 0.5, width * 0.5 + 0.5, d);
  return line * (1.0 - smoothstep(0.08, 0.14, offset));
}

float field(vec2 uv, vec2 res, float t) {
  // Hills keep their size in cells, so a phone shows a smaller piece of the same map.
  float unit = contoursScale / 200.0;
  vec2 p = (uv - 0.5) * res * unit;
  vec2 e = vec2(unit, 0.0);
  float h = contoursHeight(p, t);
  float hx = contoursHeight(p + e.xy, t);
  float hy = contoursHeight(p + e.yx, t);

  // Half tone is the middle palette colour exactly, so thin lines come out solid.
  float tone = contoursLine(h, hx, hy, contoursLines, 1.2) * 0.5;
  if (contoursIndex > 0.5) {
    float nearest = floor(h * contoursLines + 0.5);
    float isIndex = 1.0 - step(0.5, mod(nearest, contoursIndex));
    float heavy = contoursLine(h, hx, hy, contoursLines, 2.0);
    tone = mix(tone, heavy, isIndex);
  }

  // Hillshade, lit from the top left: slopes facing away pick up a light stipple.
  vec2 grad = vec2(hx - h, hy - h) / unit;
  vec3 n = normalize(vec3(-grad * 0.9, 1.0));
  float lit = dot(n, normalize(vec3(-0.6, 0.6, 0.6)));
  float shade = contoursRelief * 0.28 * smoothstep(0.6, 0.15, lit);
  return max(tone, shade);
}
`;

/** Faint concentric rings in CSS, shown without WebGL. */
const fallbackImage = (palette: DitherPalette) => {
  const ink = cssColor(palette.at(-1) ?? palette[1]);
  const line = `color-mix(in oklab, ${ink} 30%, transparent)`;
  return `repeating-radial-gradient(ellipse 120% 90% at 35% 40%, transparent 0 22px, ${line} 22px 24px)`;
};

/**
 * A topographic map: contour lines over slowly drifting hills, with every
 * fifth line drawn heavier and a light hillshade. Decorative and full-bleed:
 * size it with `className`, usually `absolute inset-0`.
 */
export const Contours = ({
  lines = 14,
  scale = 1,
  index = 5,
  relief = 0.5,
  palette = CONTOURS_PALETTE,
  stillTime = 6,
  ...props
}: ContoursProps) => (
  <DitherShader
    {...props}
    field={FIELD}
    palette={palette}
    stillTime={stillTime}
    uniforms={{
      contoursIndex: Math.max(0, Math.round(index)),
      contoursLines: Math.min(32, Math.max(4, lines)),
      contoursRelief: Math.min(1, Math.max(0, relief)),
      contoursScale: Math.max(0.1, scale),
    }}
    fallback={
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: cssColor(palette[0]),
          backgroundImage: fallbackImage(palette),
        }}
      />
    }
  />
);
