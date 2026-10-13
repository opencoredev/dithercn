"use client";

import { cssColor, DEFAULT_PALETTE, DitherShader } from "@/lib/dither";
import type { DitherShaderProps } from "@/lib/dither";

/** Where the field fades out so text on top stays clean. */
export type NoiseFieldMask = "none" | "center" | "top" | "bottom";

export type NoiseFieldProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** Size of the features. Higher values give smaller, busier noise. Default 1.3. */
  scale?: number;
  /** Contrast of the texture. 1 is soft; 2 and up give hard-edged islands. Default 1.2. */
  contrast?: number;
  /** Brightest tone the field reaches, 0 to 1. Default 0.6. */
  intensity?: number;
  /** Fade the field out where text sits. Default `"none"`. */
  mask?: NoiseFieldMask;
};

const MASKS = { bottom: 3, center: 1, none: 0, top: 2 } as const;

const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * noiseScale;
  vec2 q = vec2(
    fbm(p + vec2(0.0, t * 0.05)),
    fbm(p + vec2(5.2, 1.3) - vec2(t * 0.04, 0.0))
  );
  float n = fbm(p + 1.7 * q + vec2(t * 0.02, -t * 0.015));
  n = clamp((n - 0.5) * noiseContrast * 1.6 + 0.5, 0.0, 1.0);
  n = n * n * (3.0 - 2.0 * n);
  n *= n;

  float keep = 1.0;
  if (noiseMask > 2.5) {
    keep = smoothstep(0.05, 0.6, uv.y);
  } else if (noiseMask > 1.5) {
    keep = smoothstep(0.95, 0.4, uv.y);
  } else if (noiseMask > 0.5) {
    vec2 d = vec2((uv.x - 0.5) * 0.85, (uv.y - 0.5) * 1.7);
    keep = smoothstep(0.18, 0.62, length(d));
  }
  return n * keep * noiseIntensity;
}
`;

const FALLBACK_MASKS = {
  bottom: "linear-gradient(to top, transparent 5%, black 60%)",
  center: "radial-gradient(ellipse 60% 45% at 50% 50%, transparent 30%, black)",
  none: "none",
  top: "linear-gradient(to bottom, transparent 5%, black 60%)",
} as const satisfies Record<NoiseFieldMask, string>;

/**
 * A slow, folding fbm texture drawn as a dither, for a quiet surface
 * behind content. `mask` clears the area where your text sits.
 * Decorative and full-bleed: size it with `className`, usually
 * `absolute inset-0`.
 */
export const NoiseField = ({
  scale = 1.3,
  contrast = 1.2,
  intensity = 0.6,
  mask = "none",
  palette = DEFAULT_PALETTE,
  matrix = "bayer8",
  ...props
}: NoiseFieldProps) => {
  const ink = cssColor(palette.at(-1) ?? palette[1]);
  const fallbackMask = FALLBACK_MASKS[mask];

  return (
    <DitherShader
      {...props}
      field={FIELD}
      palette={palette}
      matrix={matrix}
      uniforms={{
        noiseContrast: Math.max(0, contrast),
        noiseIntensity: intensity,
        noiseMask: MASKS[mask],
        noiseScale: Math.max(0.1, scale),
      }}
      fallback={
        <div
          className="absolute inset-0"
          style={{ backgroundColor: cssColor(palette[0]) }}
        >
          <div
            className="absolute inset-0 opacity-25"
            style={{
              WebkitMaskImage: fallbackMask,
              backgroundImage: `radial-gradient(circle at 25% 30%, ${ink}, transparent 45%), radial-gradient(circle at 75% 70%, ${ink}, transparent 40%)`,
              maskImage: fallbackMask,
            }}
          />
        </div>
      }
    />
  );
};
