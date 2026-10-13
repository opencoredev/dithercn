"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

interface OceanWaves {
  /** Rows of swells rolling towards the viewer below a glowing horizon. */
  variant?: "ocean";
  /** Height of the horizon, 0 (bottom) to 1 (top). Default 0.62. */
  horizon?: number;
}

interface LineWaves {
  /** Thin lines that swell in the middle and taper at the ends, like a sound wave. */
  variant: "lines";
  horizon?: never;
}

export type WavesVariant = OceanWaves | LineWaves;

export type WavesProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> &
  WavesVariant & {
    /** How many waves, 2 to 8. Default 6. */
    layers?: number;
    /** Height of the waves. 1 is calm; 2 is rough. Default 1. */
    amplitude?: number;
  };

const WAVES_PALETTE = [
  "--dither-paper",
  "color-mix(in oklch, var(--dither-ink) 35%, var(--dither-paper))",
  "--dither-ink",
  "color-mix(in oklch, var(--dither-ink) 45%, var(--foreground))",
] as const satisfies DitherPalette;

const FIELD = `
float wavesHeight(float x, float fi, float k, float t) {
  float freq = mix(7.0, 2.2, k);
  float roll = sin(x * freq + t * (0.32 + 0.22 * k) + fi * 1.9);
  float chop = snoise(vec2(x * freq * 0.45 + fi * 5.0, t * 0.09 + fi));
  return roll * 0.62 + chop * 0.38;
}

float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  float x = uv.x * aspect;
  float tone = 0.0;

  if (wavesMode < 0.5) {
    float above = uv.y - wavesHorizon;
    tone = above > 0.0 ? 0.5 * exp(-above * 13.0) : 0.0;
    float glint = exp(-pow((uv.x - 0.5) * 3.2, 2.0));
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      if (fi < wavesLayers) {
        float k = fi / max(wavesLayers - 1.0, 1.0);
        float base = wavesHorizon * pow(1.0 - fi / wavesLayers, 1.45);
        float amp = wavesAmplitude * mix(0.006, 0.075, k);
        float crest = base + amp * wavesHeight(x, fi, k, t);
        float depth = (crest - uv.y) * res.y;
        if (depth > 0.0) {
          float body = mix(0.2, 0.03, k) + 0.16 * glint * (1.0 - k);
          tone = body * (0.4 + 0.6 * exp(-depth * mix(0.5, 0.06, k)));
          if (depth < 1.6) {
            tone = mix(0.95, 0.55, k) * (0.75 + 0.25 * glint);
          }
        }
      }
    }
    return tone;
  }

  float envelope = sin(3.14159265 * clamp(uv.x, 0.0, 1.0));
  envelope *= envelope;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    if (fi < wavesLayers) {
      float k = fi / max(wavesLayers - 1.0, 1.0);
      float y = 0.5 + envelope * wavesAmplitude * mix(0.3, 0.08, k) * wavesHeight(x * 0.8, fi, k, t * 1.4);
      float dist = abs(uv.y - y) * res.y;
      float line = 1.0 - smoothstep(0.4, 1.4, dist);
      float glow = exp(-dist * 0.18) * 0.22;
      tone = max(tone, max(line * mix(1.0, 0.45, k), glow * (1.0 - k * 0.6)));
    }
  }
  return tone;
}
`;

/** A horizon and a few swell lines in CSS, shown without WebGL. */
const fallbackImage = (
  shape: WavesVariant,
  palette: DitherPalette,
  horizon: number
) => {
  const ink = cssColor(palette.at(-2) ?? palette[1]);
  if (shape.variant === "lines") {
    return `linear-gradient(to bottom, transparent 46%, color-mix(in oklch, ${ink} 50%, transparent) 50%, transparent 54%)`;
  }
  const line = `${((1 - horizon) * 100).toFixed(1)}%`;
  return `linear-gradient(to bottom, transparent 30%, color-mix(in oklch, ${ink} 35%, transparent) ${line}, color-mix(in oklch, ${ink} 18%, transparent) calc(${line} + 1px), transparent)`;
};

/**
 * Layered waves drawn as a dither: rows of swells under a glowing
 * horizon, or thin lines like a sound wave. Decorative and full-bleed:
 * size it with `className`, usually `absolute inset-0`.
 */
export const Waves = (props: WavesProps) => {
  const {
    layers = 6,
    amplitude = 1,
    palette = WAVES_PALETTE,
    variant: _variant,
    horizon: _horizon,
    ...shaderProps
  } = props;
  const horizon = props.variant === "lines" ? 0.5 : (props.horizon ?? 0.62);

  return (
    <DitherShader
      {...shaderProps}
      field={FIELD}
      palette={palette}
      uniforms={{
        wavesAmplitude: Math.max(0, amplitude),
        wavesHorizon: horizon,
        wavesLayers: Math.min(8, Math.max(2, Math.round(layers))),
        wavesMode: props.variant === "lines" ? 1 : 0,
      }}
      fallback={
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: cssColor(palette[0]),
            backgroundImage: fallbackImage(props, palette, horizon),
          }}
        />
      }
    />
  );
};
