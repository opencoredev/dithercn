"use client";

import { DitherShader } from "@/lib/dither";
import type { DitherShaderProps } from "@/lib/dither";

// Step 3: noise bends the rings, time moves them outwards, and uniforms
// turn the numbers into props.
const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 drop = vec2(rippleDrop.x * aspect, 1.0 - rippleDrop.y);
  float wobble = fbm(p * 2.2 + vec2(t * 0.03, 0.0)) - 0.5;
  float d = length(p - drop) + wobble * 0.08;
  float rings = 0.5 + 0.5 * cos(d * rippleRings - t * 0.9);
  float fade = exp(-d * 2.6);
  return rippleStrength * rings * fade;
}
`;

type RipplesProps = Omit<DitherShaderProps, "field" | "uniforms"> & {
  /** Where the drop falls, from the top left, 0 to 1. */
  drop?: readonly [number, number];
  /** How tightly the rings are packed. */
  rings?: number;
  /** Peak tone, 0 to 1. */
  strength?: number;
};

const Ripples = ({
  drop = [0.5, 0.42],
  rings = 46,
  strength = 0.85,
  ...props
}: RipplesProps) => (
  <DitherShader
    {...props}
    field={FIELD}
    stillTime={4}
    uniforms={{
      rippleDrop: drop,
      rippleRings: rings,
      rippleStrength: strength,
    }}
  />
);

export default function EngineFieldRipples() {
  return (
    <div className="relative isolate flex size-full items-end overflow-hidden">
      <Ripples
        palette={["--dither-paper", "blue"]}
        matrix="bayer8"
        className="absolute inset-0 -z-10"
      />
      <p className="text-foreground p-6 text-2xl font-medium tracking-tight text-balance">
        Ripples, in eight lines of GLSL.
      </p>
    </div>
  );
}
