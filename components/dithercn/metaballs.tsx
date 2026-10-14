"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

export type MetaballsProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** Solid shaded blobs with a soft glow, or rings of contour lines around them. Default `"solid"`. */
  variant?: "solid" | "rings";
  /** How many blobs, 2 to 8. Default 5. */
  count?: number;
  /** Size of the blobs. Default 1. */
  size?: number;
};

const FIELD = `
// Sum of soft falloffs: 1.0 is the edge of a blob, more is inside.
float metaballsSum(vec2 p, float aspect, float unit, float t) {
  float sum = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    if (fi >= metaballsCount) break;
    float seed = fi * 1.618;
    // Each blob rises and sinks on its own slow loop, with a little sideways drift.
    vec2 centre = vec2(
      aspect * (0.5 + 0.3 * sin(t * (0.05 + 0.017 * fi) + seed * 2.3)),
      0.5 + 0.34 * sin(t * (0.07 + 0.013 * fi) + seed * 3.1)
    );
    float radius = unit * metaballsSize * (0.14 + 0.06 * fract(seed * 7.3));
    vec2 d = p - centre;
    sum += radius * radius / max(dot(d, d), 1e-5);
  }
  return sum;
}

float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  // In a tall box, size blobs by the width so they still fit.
  float unit = min(aspect, 1.0);
  float f = metaballsSum(p, aspect, unit, t);

  if (metaballsMode > 0.5) {
    // Contour lines of the field, evenly spaced in log space so they ring each blob.
    float cellSize = 1.0 / res.y;
    float h = log(f);
    float hx = log(metaballsSum(p + vec2(cellSize, 0.0), aspect, unit, t));
    float hy = log(metaballsSum(p + vec2(0.0, cellSize), aspect, unit, t));
    float count = 3.2;
    float v = h * count + t * 0.12;
    float offset = abs(fract(v + 0.5) - 0.5);
    float perCell = max(length(vec2(hx - h, hy - h)) * count, 1e-4);
    float line = 1.0 - smoothstep(0.3, 1.3, offset / perCell);
    float inside = smoothstep(0.85, 1.15, f);
    float fade = smoothstep(0.08, 0.6, f);
    return max(line * mix(0.45, 1.0, inside) * fade, inside * 0.14);
  }

  // Shaded inside, densest at the cores, with a soft halo around each edge.
  float inside = smoothstep(0.92, 1.08, f);
  float core = mix(0.55, 0.95, smoothstep(1.0, 3.5, f));
  float halo = 0.24 * smoothstep(0.5, 1.0, f);
  return mix(halo, core, inside);
}
`;

/** Soft CSS blobs, shown without WebGL. */
const fallbackImage = (palette: DitherPalette) => {
  const ink = cssColor(palette.at(-1) ?? palette[1]);
  const blob = (at: string) =>
    `radial-gradient(circle at ${at}, color-mix(in oklab, ${ink} 55%, transparent) 0 10%, transparent 18%)`;
  return [blob("30% 40%"), blob("62% 62%"), blob("78% 30%")].join(", ");
};

/**
 * Soft blobs that drift, merge and split like a lava lamp, drawn as a
 * dither. Decorative and full-bleed: size it with `className`, usually
 * `absolute inset-0`.
 */
export const Metaballs = ({
  variant = "solid",
  count = 5,
  size = 1,
  palette = ["--dither-paper", "--dither-ink"],
  stillTime = 20,
  ...props
}: MetaballsProps) => (
  <DitherShader
    {...props}
    field={FIELD}
    palette={palette}
    stillTime={stillTime}
    uniforms={{
      metaballsCount: Math.min(8, Math.max(2, Math.round(count))),
      metaballsMode: variant === "rings" ? 1 : 0,
      metaballsSize: Math.max(0.1, size),
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
