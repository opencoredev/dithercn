"use client";

import { useEffect, useState } from "react";

import { ScrambleText } from "@/components/dithercn/scramble-text";

const STATES = [
  { detail: "eu-west · 38 ms", label: "Deploying" },
  { detail: "all checks passed", label: "Verifying" },
  { detail: "rev 7f3a2c", label: "Live" },
];

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
    <div className="bg-background flex w-full max-w-xs flex-col gap-2 rounded-2xl p-5">
      <span className="text-muted-foreground text-xs">Production</span>
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="bg-dither-ink size-2 rounded-full"
        />
        <ScrambleText
          trigger="mount"
          duration={520}
          delay={80}
          className="font-mono text-lg font-medium tracking-tight"
        >
          {state?.label ?? ""}
        </ScrambleText>
      </span>
      <ScrambleText
        trigger="mount"
        duration={700}
        delay={160}
        characters="0123456789abcdef"
        className="text-muted-foreground font-mono text-xs"
      >
        {state?.detail ?? ""}
      </ScrambleText>
    </div>
  );
}
