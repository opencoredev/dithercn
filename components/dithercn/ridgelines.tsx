"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

export type RidgelinesProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** How many lines, 6 to 64. Default 32. */
  lines?: number;
  /** Height of the peaks. 1 is the default; 2 is twice as tall. Default 1. */
  amplitude?: number;
  /** Width of the peaked band in the middle, as a share of the box, 0.1 to 1. Default 0.5. */
  spread?: number;
  /** Faint tone under the raised peaks, 0 to 0.5. 0 keeps only the lines. Default 0.25. */
  shade?: number;
};

const FIELD = `
// Height of line fi at x, in line spacings: flat at the ends, peaked in the middle.
float ridgeHeight(float x, float fi, float t, float k) {
  float centred = (x - 0.5) / ridgeSpread;
  float envelope = exp(-centred * centred * 5.5);
  float n1 = snoise(vec2(x * 7.0 * k + fi * 0.37, fi * 0.61 + t * 0.05));
  float n2 = snoise(vec2(x * 17.0 * k - fi * 0.53, fi * 1.3 - t * 0.07));
  float peaks = max(n1 * 0.8 + n2 * 0.25 + 0.1, 0.0);
  float ripple = 0.1 * snoise(vec2(x * 36.0 * k, fi * 2.1 + t * 0.03));
  return envelope * (peaks * peaks * 4.5 + ripple + 0.25) * ridgeAmplitude;
}

float field(vec2 uv, vec2 res, float t) {
  float cellX = 1.0 / res.x;
  // Lines sit between 10% and 86% of the height, front line at the bottom.
  float top = 0.86;
  float bottom = 0.1;
  // Keep at least 4.5 cells between lines, so a short box draws fewer of them.
  float count = min(ridgeLines, floor((top - bottom) * res.y / 4.5) + 1.0);
  float spacing = (top - bottom) / max(count - 1.0, 1.0);
  // Peaks keep their shape in narrow boxes instead of crowding together.
  float freq = clamp(res.x / res.y / 1.3, 0.45, 1.4);
  float tone = 0.0;
  // ridgeHeight never exceeds 6.3 spacings per unit of amplitude.
  float reach = 6.3 * ridgeAmplitude * spacing + cellX * res.x / res.y;

  // Back to front: each line hides the ones behind it under its own paper fill.
  for (int i = 0; i < 64; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float base = top - fi * spacing;
    // Only lines that can reach this cell need their noise. A line whose
    // highest peak stays below the cell leaves it alone, and one more than six
    // spacings above it leaves a shade too faint for any threshold, so it
    // just clears what the lines behind it drew.
    if (uv.y > base + reach) continue;
    if (base - uv.y > 6.0 * spacing) {
      tone = 0.0;
      continue;
    }
    float h = ridgeHeight(uv.x, fi, t, freq);
    float y = base + h * spacing;
    // Under the line, its fill hides the lines behind. Raised peaks get a faint
    // shade that fades downwards, so the ridges read as solid.
    float under = (y - uv.y) / spacing;
    float shade = ridgeShade * smoothstep(0.6, 3.0, h) * exp(-under * 0.7);
    if (under > 1.0) {
      tone = shade;
      continue;
    }
    float yNext = base + ridgeHeight(uv.x + cellX, fi, t, freq) * spacing;
    // Distance to the curve in cells, corrected for its slope so steep peaks keep their width.
    float slope = (yNext - y) * res.y;
    float d = abs(uv.y - y) * res.y / sqrt(1.0 + slope * slope);
    if (uv.y < y) {
      tone = shade;
    }
    // A hard edge keeps each line one crisp cell wide instead of two dithered rows.
    tone = max(tone, step(d, 0.5));
  }
  return tone;
}
`;

/** A few thin CSS lines across the box, shown without WebGL. */
const fallbackImage = (palette: DitherPalette) => {
  const ink = cssColor(palette.at(-1) ?? palette[1]);
  return `repeating-linear-gradient(to bottom, transparent 0 15px, color-mix(in oklab, ${ink} 35%, transparent) 15px 16px)`;
};

/**
 * Stacked ridge lines like a pulsar plot, each hiding the ones behind it,
 * drawn as a dither. The peaks shift slowly. Decorative and full-bleed:
 * size it with `className`, usually `absolute inset-0`.
 */
export const Ridgelines = ({
  lines = 32,
  amplitude = 1,
  spread = 0.5,
  shade = 0.25,
  palette = ["--dither-paper", "--dither-ink"],
  stillTime = 8,
  ...props
}: RidgelinesProps) => (
  <DitherShader
    {...props}
    field={FIELD}
    palette={palette}
    stillTime={stillTime}
    uniforms={{
      ridgeAmplitude: Math.max(0, amplitude),
      ridgeLines: Math.min(64, Math.max(6, Math.round(lines))),
      ridgeShade: Math.min(0.5, Math.max(0, shade)),
      ridgeSpread: Math.min(1, Math.max(0.1, spread)),
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
