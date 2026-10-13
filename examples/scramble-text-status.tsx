"use client";

import { useEffect, useState } from "react";

import {
  ScrambleText,
  SCRAMBLE_HEX,
} from "@/components/dithercn/scramble-text";
import { cssColor } from "@/lib/dither";

const STATES = [
  { color: "orange", detail: "build 7f3a2c1 · eu-west", label: "Deploying" },
  { color: "blue", detail: "checks 42 of 42 passed", label: "Verifying" },
  { color: "green", detail: "rev 7f3a2c1 · 38 ms p50", label: "Live" },
] as const;

export default function ScrambleTextStatus() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setStep((value) => (value + 1) % STATES.length),
      2800
    );
    return () => clearInterval(timer);
  }, []);

  const state = STATES[step] ?? STATES[0];

  return (
    <div className="bg-background flex w-full max-w-xs flex-col gap-3 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">Production</span>
        <span className="text-muted-foreground font-mono text-[11px]">
          main
        </span>
      </div>
      <span className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="size-2 rounded-[1px] transition-colors duration-500"
          style={{ backgroundColor: cssColor(state.color) }}
        />
        <ScrambleText
          trigger="change"
          color={state.color}
          caret="running"
          className="text-xl font-medium tracking-tight"
          aria-live="polite"
        >
          {state.label}
        </ScrambleText>
      </span>
      <ScrambleText
        trigger="change"
        mode="glyphs"
        characters={SCRAMBLE_HEX}
        color="grey"
        delay={120}
        stagger={14}
        className="text-muted-foreground font-mono text-xs"
      >
        {state.detail}
      </ScrambleText>
    </div>
  );
}
