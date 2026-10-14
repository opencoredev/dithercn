"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

export type SilkProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** How many folds cross the box. Default 6. */
  folds?: number;
  /** Direction the folds run, in degrees as in CSS: 90 runs them left to right. Default 110. */
  angle?: number;
  /** How narrow and bright the highlights on each fold are, 0 to 1. Default 0.6. */
  sheen?: number;
  /** The brightest tone, 0 to 1. Lower it to sit text on top. Default 1. */
  intensity?: number;
};

const SILK_PALETTE = [
  "--dither-paper",
  "color-mix(in oklch, var(--dither-ink) 30%, var(--dither-paper))",
  "color-mix(in oklch, var(--dither-ink) 65%, var(--dither-paper))",
  "--dither-ink",
] as const satisfies DitherPalette;

const FIELD = `
// The cloth: a height that rises and falls across the folds, bent by slow waves.
float silkHeight(vec2 p, float t) {
  float bend = 0.55 * sin(p.x * 0.9 + t * 0.09)
    + 0.3 * sin(p.x * 1.7 - p.y * 0.4 + t * 0.06 + 1.3)
    + 0.35 * snoise(p * 0.35 + vec2(t * 0.015, 0.0));
  float across = (p.y + bend) * silkFolds * 0.9;
  // Uneven folds: some pleats bunch up, others hang wide.
  across += 0.6 * sin(across * 0.5 + p.x * 0.3 + t * 0.04);
  return sin(across + 0.4 * sin(p.x * 0.7 - t * 0.05));
}

float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 c = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) * 3.2;
  float a = radians(silkAngle - 90.0);
  vec2 p = mat2(cos(a), sin(a), -sin(a), cos(a)) * c;

  float e = 3.2 / res.y;
  float h = silkHeight(p, t);
  float hx = silkHeight(p + vec2(e, 0.0), t);
  float hy = silkHeight(p + vec2(0.0, e), t);
  // Divide by the fold count so more folds don't mean steeper ones.
  vec2 grad = vec2(hx - h, hy - h) / e / max(silkFolds, 0.5);
  vec3 n = normalize(vec3(-grad * 1.4, 1.0));

  // Wrapped diffuse light, so shadowed sides fall off smoothly instead of
  // cutting to paper, and a tight highlight along each crest.
  vec3 light = normalize(vec3(-0.45, 0.65, 0.6));
  float diffuse = 0.5 + 0.5 * dot(n, light);
  vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
  float shine = pow(max(dot(n, halfway), 0.0), mix(6.0, 48.0, silkSheen));

  // The light falls off across the cloth, so one side sits in shadow.
  float pool = smoothstep(-0.6, 0.9, snoise(c * 0.3 + vec2(t * 0.012, 0.4)) * 0.6 + 0.3 * c.y);
  float tone = pow(smoothstep(0.25, 1.0, diffuse), 2.0) * 0.72 + shine * mix(0.45, 0.85, silkSheen);
  return clamp(tone * mix(0.55, 1.0, pool), 0.0, 1.0) * silkIntensity;
}
`;

/** Soft diagonal sheens in CSS, shown without WebGL. */
const fallbackImage = (palette: DitherPalette, angle: number) => {
  const top = cssColor(palette.at(-1) ?? palette[1]);
  const mid = cssColor(palette[1]);
  return `repeating-linear-gradient(${angle}deg, transparent 0, color-mix(in oklab, ${mid} 40%, transparent) 12%, color-mix(in oklab, ${top} 35%, transparent) 15%, transparent 25%)`;
};

/**
 * Folds of silk catching the light: smooth sheets that ripple and shift,
 * with a bright highlight along each crest. Decorative and full-bleed: size
 * it with `className`, usually `absolute inset-0`.
 */
export const Silk = ({
  folds = 6,
  angle = 110,
  sheen = 0.6,
  intensity = 1,
  palette = SILK_PALETTE,
  matrix = "bayer8",
  stillTime = 7,
  ...props
}: SilkProps) => (
  <DitherShader
    {...props}
    field={FIELD}
    palette={palette}
    matrix={matrix}
    stillTime={stillTime}
    uniforms={{
      silkAngle: angle,
      silkFolds: Math.max(0.5, folds),
      silkIntensity: Math.min(1, Math.max(0, intensity)),
      silkSheen: Math.min(1, Math.max(0, sheen)),
    }}
    fallback={
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: cssColor(palette[0]),
          backgroundImage: fallbackImage(palette, angle),
        }}
      />
    }
  />
);
