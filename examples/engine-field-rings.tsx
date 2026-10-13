"use client";

import { DitherShader } from "@/lib/dither";

// Step 2: square units, then rings around a point that fade with distance.
const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 drop = vec2(0.5 * aspect, 0.45);
  float d = length(p - drop);
  float rings = 0.5 + 0.5 * cos(d * 48.0);
  float fade = exp(-d * 3.0);
  return rings * fade;
}
`;

export default function EngineFieldRings() {
  return (
    <DitherShader
      field={FIELD}
      animate={false}
      palette={["--dither-paper", "blue"]}
      className="absolute inset-0"
    />
  );
}
