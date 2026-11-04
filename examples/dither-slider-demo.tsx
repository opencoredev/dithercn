"use client";

import { DitherSlider } from "@/components/dithercn/dither-slider";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/dither-slider-controls";

export default function DitherSliderDemo() {
  const color = usePreviewValue(knobs.tint);
  const size = usePreviewValue(knobs.size);
  const matrix = usePreviewValue(knobs.matrix);
  const bloom = usePreviewValue(knobs.bloom);
  const cell = usePreviewValue(knobs.cell);
  const ticks = usePreviewValue(knobs.ticks);
  const disabled = usePreviewValue(knobs.disabled);
  const shared = { bloom, cell, color, disabled, matrix, size };

  return (
    <div className="bg-background border-border flex w-full max-w-md flex-col gap-7 rounded-2xl border p-5 [--dither-paper:var(--background)] sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-medium">Autoscaling</span>
        <span className="text-muted-foreground font-mono text-xs">api-web</span>
      </div>
      <DitherSlider
        {...shared}
        label="Target CPU"
        defaultValue={[64]}
        unit="%"
      />
      <DitherSlider
        {...shared}
        label="Instances"
        defaultValue={[3, 10]}
        min={1}
        max={16}
        minStepsBetweenThumbs={1}
        ticks={ticks}
        showRange
      />
    </div>
  );
}
