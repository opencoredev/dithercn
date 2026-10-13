"use client";

import { useEffect, useState } from "react";

import { ProgressBar } from "@/components/dithercn/progress-bar";

const STEPS = [
  "Installing dependencies",
  "Compiling 214 modules",
  "Generating static pages",
  "Uploading build output",
] as const;

export default function ProgressBarDemo() {
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((value) => (value >= 100 ? 8 : Math.min(100, value + 7)));
    }, 700);
    return () => window.clearInterval(timer);
  }, []);

  const step = STEPS[Math.min(STEPS.length - 1, Math.floor(progress / 25))];

  return (
    <div className="bg-background flex w-full max-w-md flex-col gap-6 rounded-xl border p-5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-medium">Deploying web</span>
        <span className="text-muted-foreground font-mono text-xs">4f2a1c9</span>
      </div>
      <ProgressBar label={step} value={progress} />
      <ProgressBar label="Waiting for checks" size="sm" />
    </div>
  );
}
