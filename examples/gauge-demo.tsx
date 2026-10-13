"use client";

import { useId, useState } from "react";

import { Gauge } from "@/components/dithercn/gauge";

export default function GaugeDemo() {
  const [load, setLoad] = useState(68);
  const id = useId();

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-8">
      <Gauge value={load} label="CPU load" unit="%" size={240} />
      <div className="flex w-full items-center gap-4">
        <label htmlFor={id} className="text-muted-foreground shrink-0 text-sm">
          Load
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={load}
          onChange={(event) => setLoad(Number(event.target.value))}
          className="accent-primary h-1 flex-1 cursor-pointer"
        />
      </div>
    </div>
  );
}
