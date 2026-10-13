"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

export type MeshGradientProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** How many colour blobs drift across the box, 3 to 5. Default 4. */
  blobs?: 3 | 4 | 5;
  /** Size of each blob, as a share of the box height. Default 0.6. */
  size?: number;
  /**
   * Paper first, then one colour per blob. Blob `i` takes colour `i + 1`,
   * so pass `blobs + 1` colours for one colour each; where blobs meet,
   * the colours between them show. Default: paper through four tints of
   * `--dither-ink`.
   */
  palette?: DitherPalette;
};

const tint = (amount: number, base = "var(--dither-paper)") =>
  `color-mix(in oklch, var(--dither-ink) ${amount}%, ${base})`;

const MESH_PALETTE = [
  "--dither-paper",
  tint(28),
  `color-mix(in oklch, var(--dither-ink) 45%, oklch(0.6 0.22 318))`,
  "--dither-ink",
  tint(58, "var(--foreground)"),
] as const satisfies DitherPalette;

const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 warp = vec2(fbm(p * 1.1 + vec2(t * 0.02, 0.0)), fbm(p * 1.1 + vec2(7.3, -t * 0.02)));
  p += (warp - 0.5) * 0.35;
  float weights = 0.32;
  float tones = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    if (fi < meshCount) {
      float sx = 0.045 * (1.0 + fi * 0.23);
      float sy = 0.038 * (1.0 + fi * 0.19);
      vec2 c = vec2(
        (0.5 + 0.38 * cos(t * sx + fi * 2.4)) * aspect,
        0.5 + 0.36 * sin(t * sy + fi * 1.7)
      );
      float d = length(p - c) / meshSize;
      float w = exp(-d * d * 2.2);
      weights += w;
      tones += w * (fi + 1.0) / meshCount;
    }
  }
  return tones / weights;
}
`;

/** The blobs as blurred CSS radial gradients, shown without WebGL. */
const fallbackImage = (palette: DitherPalette, blobs: number) => {
  const spots = [
    [20, 25],
    [78, 30],
    [65, 80],
    [25, 75],
    [50, 50],
  ] as const;
  return spots
    .slice(0, blobs)
    .map(([x, y], index) => {
      const color = palette[Math.min(index + 1, palette.length - 1)];
      return `radial-gradient(circle at ${x}% ${y}%, ${cssColor(color ?? palette[1])} 0%, transparent 55%)`;
    })
    .join(", ");
};

/**
 * Three to five colour blobs that drift and melt into each other, drawn
 * as a dither. Decorative and full-bleed: size it with `className`,
 * usually `absolute inset-0`.
 */
export const MeshGradient = ({
  blobs = 4,
  size = 0.6,
  palette = MESH_PALETTE,
  matrix = "blue-noise",
  ...props
}: MeshGradientProps) => {
  const count = Math.min(5, Math.max(3, Math.round(blobs)));

  return (
    <DitherShader
      {...props}
      field={FIELD}
      palette={palette}
      matrix={matrix}
      uniforms={{ meshCount: count, meshSize: Math.max(0.05, size) }}
      fallback={
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundColor: cssColor(palette[0]),
            backgroundImage: fallbackImage(palette, count),
          }}
        />
      }
    />
  );
};
