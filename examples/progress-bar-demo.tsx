"use client";

import { useEffect, useState } from "react";

import { ProgressBar } from "@/components/dithercn/progress-bar";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/progress-bar-controls";

const STEPS = [
  "Installing dependencies",
  "Compiling 214 modules",
  "Generating static pages",
  "Uploading build output",
] as const;

export default function ProgressBarDemo() {
  const fill = usePreviewValue(knobs.fill);
  const color = usePreviewValue(knobs.tint);
  const bloom = usePreviewValue(knobs.bloom);
  const size = usePreviewValue(knobs.size);
  const segments = usePreviewValue(knobs.segments);
  const indeterminate = usePreviewValue(knobs.indeterminate);
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((value) => (value >= 100 ? 12 : Math.min(100, value + 8)));
    }, 900);
    return () => window.clearInterval(timer);
  }, []);

  const step = STEPS[Math.min(STEPS.length - 1, Math.floor(progress / 25))];

  return (
    <div className="bg-background border-border flex w-full max-w-md flex-col gap-5 rounded-2xl border p-5 [--dither-paper:var(--background)] sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-medium">Deploying web</span>
        <span className="text-muted-foreground font-mono text-xs">4f2a1c9</span>
      </div>
      <ProgressBar
        label={indeterminate ? "Waiting for a build runner" : step}
        value={indeterminate ? null : progress}
        fill={fill}
        color={color}
        bloom={bloom}
        size={size}
        segments={segments === 0 ? undefined : segments}
      />
    </div>
  );
}
