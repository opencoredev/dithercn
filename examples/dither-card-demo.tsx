"use client";

import { DitherCard } from "@/components/dithercn/dither-card";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/dither-card-controls";

export default function DitherCardDemo() {
  const fill = usePreviewValue(knobs.fill);
  const color = usePreviewValue(knobs.tint);
  const glow = usePreviewValue(knobs.glow);
  const strength = usePreviewValue(knobs.strength);

  return (
    <DitherCard
      glow={glow}
      fill={fill}
      color={color}
      strength={strength}
      interactive
      reach={170}
      tabIndex={0}
      className="bg-background w-full max-w-sm px-6 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="flex flex-col gap-1 pt-32">
        <span className="text-muted-foreground text-sm">Monthly revenue</span>
        <span className="text-4xl font-semibold tracking-tight tabular-nums">
          $48,210
        </span>
      </div>
      <p className="text-muted-foreground text-sm">
        Up 12% on September, with most of the growth from annual plans.
      </p>
    </DitherCard>
  );
}
