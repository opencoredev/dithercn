"use client";

import { useId, useState } from "react";

import { DitherShader } from "@/lib/dither";

// A soft glow from the lower left corner.
const GLOW = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  return clamp(1.15 - length(p) * 0.85, 0.0, 1.0);
}
`;

export default function ConceptCell() {
  const [cell, setCell] = useState(3);
  const id = useId();

  return (
    <div className="relative size-full">
      <DitherShader
        field={GLOW}
        cell={cell}
        animate={false}
        className="absolute inset-0"
      />
      <div className="bg-background/85 absolute inset-x-3 bottom-3 flex items-center gap-4 rounded-full px-4 py-2.5 backdrop-blur-sm sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-72">
        <label htmlFor={id} className="text-muted-foreground shrink-0 text-sm">
          cell
        </label>
        <input
          id={id}
          type="range"
          min={1}
          max={12}
          value={cell}
          onChange={(event) => setCell(Number(event.target.value))}
          className="accent-primary h-1 flex-1 cursor-pointer"
        />
        <output
          htmlFor={id}
          className="w-9 text-right font-mono text-sm tabular-nums"
        >
          {cell}px
        </output>
      </div>
    </div>
  );
}
