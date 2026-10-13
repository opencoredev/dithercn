"use client";

import { Tabs as TabsPrimitive } from "radix-ui";

import { DitherShader } from "@/lib/dither";
import { cn } from "@/lib/utils";

/**
 * Landing showcase: a request you might give your agent, and a dither built
 * on the engine for it. Each result is a few lines of GLSL written for this
 * page, not an installed example, which is the point being made.
 */

const TOPO_FIELD = `
float showTopoHeight(vec2 p, float t) {
  vec2 drift = vec2(t * 0.025, t * 0.012);
  return 0.5 + 0.32 * snoise(p * 0.85 + drift) + 0.14 * snoise(p * 1.9 - drift * 1.4 + 3.1);
}

float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float e = 1.0 / res.y;
  float h = showTopoHeight(p, t);
  float hx = showTopoHeight(p + vec2(e, 0.0), t);
  float hy = showTopoHeight(p + vec2(0.0, e), t);
  float v = h * 12.0;
  float perCell = max(length(vec2(hx - h, hy - h)) * 12.0, 1e-4);
  float d = abs(fract(v + 0.5) - 0.5) / perCell;
  float line = 1.0 - smoothstep(0.3, 1.1, d);
  float major = 1.0 - step(0.5, mod(floor(v + 0.5), 4.0));
  float clear = smoothstep(0.0, 0.5, length((uv - vec2(0.5, 0.5)) * res / vec2(50.0, 14.0)) - 1.0);
  return line * mix(0.55, 1.0, major) * clear;
}
`;

const METER_FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 c = (uv - vec2(0.5, 0.5)) * vec2(aspect, 1.0);
  float r = length(c);
  float angle = fract(atan(c.x, c.y) / 6.2831853);
  float cellSize = 1.0 / res.y;
  float band = 1.0 - smoothstep(0.0, 1.5 * cellSize, abs(r - 0.33) - 0.05);
  float filled = step(angle, showMeterValue);
  float along = angle / max(showMeterValue, 0.001);
  float inner = smoothstep(0.28, 0.38, r);
  float arc = mix(0.35, 1.0, along * along) * mix(0.75, 1.0, inner);
  return band * mix(0.1, arc, filled);
}
`;

const RIPPLE_FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 drop = vec2(0.5 * aspect, 0.5);
  float wobble = fbm(p * 2.2 + vec2(t * 0.03, 0.0)) - 0.5;
  float d = length(p - drop) + wobble * 0.08;
  float rings = 0.5 + 0.5 * cos(d * 40.0 - t * 0.9);
  float clear = smoothstep(0.0, 0.6, length((uv - vec2(0.5, 0.5)) * res / vec2(36.0, 12.0)) - 1.0);
  return 0.85 * rings * exp(-d * 2.2) * clear;
}
`;

const MeterResult = () => (
  <>
    <DitherShader
      field={METER_FIELD}
      uniforms={{ showMeterValue: 0.72 }}
      palette={["--dither-paper", "green"]}
      matrix="bayer8"
      animate={false}
      className="absolute inset-0"
    />
    <div className="relative flex flex-col items-center gap-1 text-center">
      <span className="text-4xl font-medium tracking-[-0.04em] tabular-nums sm:text-5xl">
        72%
      </span>
      <span className="text-muted-foreground text-sm">of storage used</span>
    </div>
  </>
);

const SHOWCASE = [
  {
    id: "topo",
    prompt:
      "A dithered topographic background behind the hero. Slow, and quiet enough to read over.",
    result: (
      <>
        <DitherShader
          field={TOPO_FIELD}
          palette={["--dither-paper", "blue"]}
          stillTime={8}
          className="absolute inset-0"
        />
        <p className="relative text-2xl font-medium tracking-[-0.03em]">
          Field notes for the trail
        </p>
      </>
    ),
    technique: "DitherShader · contour field",
  },
  {
    id: "meter",
    prompt:
      "A radial usage meter for the billing card. 72% used, with the number in the middle.",
    result: <MeterResult />,
    technique: "DitherShader · arc field",
  },
  {
    id: "ripples",
    prompt: "Ripples spreading out from behind the pricing headline.",
    result: (
      <>
        <DitherShader
          field={RIPPLE_FIELD}
          palette={["--dither-paper", "purple"]}
          matrix="bayer8"
          stillTime={4}
          className="absolute inset-0"
        />
        <p className="relative text-2xl font-medium tracking-[-0.03em]">
          Simple pricing
        </p>
      </>
    ),
    technique: "DitherShader · ripple field",
  },
] as const;

export const AgentShowcase = ({ className }: { className?: string }) => (
  <TabsPrimitive.Root
    defaultValue={SHOWCASE[0].id}
    orientation="vertical"
    className={cn(
      "grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6",
      className
    )}
  >
    <TabsPrimitive.List
      aria-label="Requests to an agent"
      className="flex flex-col gap-2"
    >
      {SHOWCASE.map((item) => (
        <TabsPrimitive.Trigger
          key={item.id}
          value={item.id}
          className="group/ask text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground focus-visible:ring-ring/50 flex flex-col items-start gap-2 rounded-[16px] border border-transparent p-4 text-left transition-colors duration-150 outline-none focus-visible:ring-[3px] data-[state=active]:border-border"
        >
          <span className="text-[0.95rem] leading-snug text-pretty">
            &ldquo;{item.prompt}&rdquo;
          </span>
          <span className="text-muted-foreground font-mono text-xs">
            {item.technique}
          </span>
        </TabsPrimitive.Trigger>
      ))}
    </TabsPrimitive.List>
    {SHOWCASE.map((item) => (
      <TabsPrimitive.Content
        key={item.id}
        value={item.id}
        className="focus-visible:ring-ring/50 rounded-[18px] outline-none focus-visible:ring-[3px]"
      >
        <div className="bg-background relative isolate flex h-[300px] items-center justify-center overflow-hidden rounded-[18px] border [--dither-paper:var(--background)] sm:h-[380px] lg:h-full lg:min-h-[380px]">
          {item.result}
        </div>
      </TabsPrimitive.Content>
    ))}
  </TabsPrimitive.Root>
);
