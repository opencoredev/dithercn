import type { CSSProperties } from "react";

import { DitherShader } from "@/lib/dither";
import type { DitherShaderProps } from "@/lib/dither";

// The field draws only the shape: wavy lines with a soft glow. It says
// nothing about colour.
const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float x = uv.x * res.x / res.y;
  float tone = 0.0;
  for (int i = 0; i < 9; i++) {
    if (float(i) >= spectrumLines) break;
    float k = float(i);
    float base = 0.18 + 0.64 * k / max(spectrumLines - 1.0, 1.0);
    float y = base
      + 0.035 * sin(x * 2.4 + t * 0.5 + k * 0.9)
      + 0.015 * sin(x * 5.3 - t * 0.35 + k * 1.7);
    float d = abs(uv.y - y) * res.y / spectrumWidth;
    tone = max(tone, exp(-d * d) + 0.35 * exp(-d * 0.6));
  }
  return tone;
}
`;

// The colour comes from a layer underneath: one hue per line, top to bottom.
// The stops sit at the lines' heights within the layer.
const SPECTRUM =
  "linear-gradient(to bottom, oklch(0.68 0.22 25) 14%, oklch(0.75 0.18 60) 26%, oklch(0.8 0.17 100) 38%, oklch(0.72 0.2 145) 50%, oklch(0.72 0.14 210) 62%, oklch(0.62 0.2 265) 74%, oklch(0.62 0.24 310) 86%)";

type SpectrumLinesProps = Omit<
  DitherShaderProps,
  "field" | "palette" | "uniforms"
> & {
  /** Any CSS background. Each line takes the colour beneath it. */
  colors?: CSSProperties["background"];
  /** How many lines, from 1 to 9. */
  lines?: number;
  /** Line thickness in cells; the glow spreads a few times wider. */
  width?: number;
};

const SpectrumLines = ({
  colors = SPECTRUM,
  lines = 7,
  width = 1.2,
  className,
  ...props
}: SpectrumLinesProps) => (
  <div className={className}>
    {/* Covers only the band the lines and their glow use, so no colour shows at rounded corners. */}
    <div
      aria-hidden
      className="absolute inset-x-0 inset-y-[6%]"
      style={{ background: colors }}
    />
    {/* Tone 0 paints the page background; tone 1 is transparent and lets the colour through. */}
    <DitherShader
      {...props}
      field={FIELD}
      palette={["--background", "transparent"]}
      stillTime={3}
      uniforms={{ spectrumLines: lines, spectrumWidth: width }}
      className="absolute inset-0"
    />
  </div>
);

export default function ConceptHues() {
  return (
    <SpectrumLines
      matrix="bayer8"
      className="relative isolate size-full overflow-hidden"
    />
  );
}
