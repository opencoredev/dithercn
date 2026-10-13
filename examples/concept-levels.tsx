"use client";

import { useId, useState } from "react";

import { DitherShader } from "@/lib/dither";

const RAMP = `float field(vec2 uv, vec2 res, float t) { return uv.x; }`;

export default function ConceptLevels() {
  const [levels, setLevels] = useState(5);
  const id = useId();

  return (
    <div className="flex w-full flex-col gap-4">
      <DitherShader
        field={RAMP}
        levels={levels}
        animate={false}
        className="h-24 rounded-lg sm:h-32"
      />
      <div className="flex items-center gap-4">
        <label htmlFor={id} className="text-muted-foreground shrink-0 text-sm">
          levels
        </label>
        <input
          id={id}
          type="range"
          min={2}
          max={17}
          value={levels}
          onChange={(event) => setLevels(Number(event.target.value))}
          className="accent-primary h-1 flex-1 cursor-pointer"
        />
        <output
          htmlFor={id}
          className="w-6 text-right font-mono text-sm tabular-nums"
        >
          {levels}
        </output>
      </div>
    </div>
  );
}
