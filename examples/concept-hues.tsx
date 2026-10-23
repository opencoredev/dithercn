import { DitherShader } from "@/lib/dither";
import type { DitherShaderProps } from "@/lib/dither";

// Shared by both functions: the nearest line to this cell, as
// (distance in line widths, line index).
const LINES = `
vec2 spectrumNearest(vec2 uv, vec2 res, float t) {
  float x = uv.x * res.x / res.y;
  vec2 best = vec2(1e4, 0.0);
  for (int i = 0; i < 9; i++) {
    if (float(i) >= spectrumLines) break;
    float k = float(i);
    float base = 0.18 + 0.64 * k / max(spectrumLines - 1.0, 1.0);
    float y = base
      + 0.035 * sin(x * 2.4 + t * 0.5 + k * 0.9)
      + 0.015 * sin(x * 5.3 - t * 0.35 + k * 1.7);
    float d = abs(uv.y - y) * res.y / spectrumWidth;
    if (d < best.x) best = vec2(d, k);
  }
  return best;
}
`;

// Where the dots go: a thin core and a soft glow around each line.
const FIELD = `${LINES}
float field(vec2 uv, vec2 res, float t) {
  float d = spectrumNearest(uv, res, t).x;
  return exp(-d * d) + 0.35 * exp(-d * 0.6);
}
`;

// What colour they are: a rainbow that runs along each line and drifts,
// shifted a little per line. Mixing in the theme's ink keeps it readable
// on white as well as black.
const COLOR_FIELD = `
vec3 colorField(vec2 uv, vec2 res, float t) {
  float k = spectrumNearest(uv, res, t).y;
  vec3 hue = spectrum(uv.x * 0.75 + k * 0.06 - t * 0.03);
  return mix(hue, paletteColor(0.0).rgb, 0.2);
}
`;

type SpectrumLinesProps = Omit<
  DitherShaderProps,
  "field" | "colorField" | "uniforms"
> & {
  /** How many lines, from 1 to 9. */
  lines?: number;
  /** Line thickness in cells; the glow spreads a few times wider. */
  width?: number;
};

const SpectrumLines = ({
  lines = 7,
  width = 1.2,
  palette = ["--background", "--foreground"],
  ...props
}: SpectrumLinesProps) => (
  <DitherShader
    {...props}
    field={FIELD}
    colorField={COLOR_FIELD}
    palette={palette}
    stillTime={3}
    uniforms={{ spectrumLines: lines, spectrumWidth: width }}
  />
);

export default function ConceptHues() {
  return <SpectrumLines matrix="bayer8" className="size-full" />;
}
