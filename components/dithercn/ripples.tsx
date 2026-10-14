"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

/** A point relative to the box: x from the left, y from the top. May lie outside 0 to 1. */
export type RipplesSource = readonly [number, number];

export type RipplesProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /**
   * Where the rings start, as fractions of the box from the top left. One
   * to four points; rings from different points cross and interfere.
   * Default `[[0.28, 0.38], [0.74, 0.66]]`.
   */
  sources?: readonly RipplesSource[];
  /** How many rings fit in the height of the box. Default 12. */
  rings?: number;
  /** How quickly the rings fade away from their source. 0 keeps them strong across the box. Default 1. */
  decay?: number;
  /** The brightest tone, 0 to 1. Lower it to sit text on top. Default 1. */
  intensity?: number;
};

const DEFAULT_SOURCES: readonly RipplesSource[] = [
  [0.28, 0.38],
  [0.74, 0.66],
];

const RIPPLES_PALETTE = [
  "--dither-paper",
  "color-mix(in oklch, var(--dither-ink) 45%, var(--dither-paper))",
  "--dither-ink",
] as const satisfies DitherPalette;

const FIELD = `
// One source: a train of thin rings moving outwards, fading with distance.
float ripplesRing(vec2 p, vec2 at, float aspect, float t, float phase) {
  vec2 o = vec2(at.x * aspect, 1.0 - at.y);
  float d = length(p - o);
  float wave = 0.5 + 0.5 * cos(d * ripplesRings * 6.2831853 - t * 0.8 + phase);
  float envelope = exp(-d * ripplesDecay * 3.4) * smoothstep(0.0, 0.05, d);
  return smoothstep(0.72, 0.92, wave) * envelope;
}

float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  // A slow swell bends the rings slightly, as on real water.
  p += 0.01 * vec2(snoise(p * 1.4 + vec2(t * 0.03, 0.0)), snoise(p * 1.4 + vec2(5.2, t * 0.025)));

  float sum = ripplesRing(p, ripplesA.xy, aspect, t, 0.0);
  if (ripplesCount > 1.5) sum += ripplesRing(p, ripplesA.zw, aspect, t, 2.1);
  if (ripplesCount > 2.5) sum += ripplesRing(p, ripplesB.xy, aspect, t, 4.2);
  if (ripplesCount > 3.5) sum += ripplesRing(p, ripplesB.zw, aspect, t, 1.3);

  // Rings are brightest near their source and fade to the middle colour and out;
  // where two crests cross they add up to ink.
  return ripplesIntensity * clamp(sum * 0.9, 0.0, 1.0);
}
`;

const packSources = (sources: readonly RipplesSource[]) => {
  const [a = DEFAULT_SOURCES[0], b = a, c = a, d = a] = sources;
  return {
    ripplesA: [a[0], a[1], b[0], b[1]] as const,
    ripplesB: [c[0], c[1], d[0], d[1]] as const,
  };
};

/** Rings around each source in CSS, shown without WebGL. */
const fallbackImage = (
  palette: DitherPalette,
  sources: readonly RipplesSource[]
) => {
  const ink = cssColor(palette.at(-1) ?? palette[1]);
  const line = `color-mix(in oklab, ${ink} 25%, transparent)`;
  return sources
    .slice(0, 4)
    .map(
      ([x, y]) =>
        `repeating-radial-gradient(circle at ${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%, transparent 0 18px, ${line} 18px 21px, transparent 21px 36px)`
    )
    .join(", ");
};

/**
 * Concentric rings spreading from one to four points, crossing and
 * interfering like drops on still water. Decorative and full-bleed: size it
 * with `className`, usually `absolute inset-0`.
 */
export const Ripples = ({
  sources = DEFAULT_SOURCES,
  rings = 12,
  decay = 1,
  intensity = 1,
  palette = RIPPLES_PALETTE,
  stillTime = 5,
  ...props
}: RipplesProps) => (
  <DitherShader
    {...props}
    field={FIELD}
    palette={palette}
    stillTime={stillTime}
    uniforms={{
      ...packSources(sources),
      ripplesCount: Math.min(4, Math.max(1, sources.length)),
      ripplesDecay: Math.max(0, decay),
      ripplesIntensity: Math.min(1, Math.max(0, intensity)),
      ripplesRings: Math.max(1, rings),
    }}
    fallback={
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: cssColor(palette[0]),
          backgroundImage: fallbackImage(palette, sources),
        }}
      />
    }
  />
);
