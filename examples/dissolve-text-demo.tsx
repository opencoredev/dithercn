"use client";

import { DissolveText } from "@/components/dithercn/dissolve-text";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/dissolve-text-controls";

export default function DissolveTextDemo() {
  const by = usePreviewValue(knobs.by);
  const direction = usePreviewValue(knobs.direction);
  const fill = usePreviewValue(knobs.fill);
  const accent = usePreviewValue(knobs.accent);
  const cell = usePreviewValue(knobs.cell);
  const speed = usePreviewValue(knobs.speed);

  return (
    <DissolveText
      // Remount on a knob change so the new settings play from the start.
      key={`${by}-${direction}-${fill}-${accent}-${cell}-${speed}`}
      as="h2"
      by={by}
      direction={direction}
      fill={fill}
      accent={accent}
      cell={cell}
      speed={speed}
      trigger="mount"
      className="max-w-2xl px-6 text-center text-5xl leading-[0.95] font-bold tracking-[-0.05em] text-balance sm:text-7xl"
    >
      Arrives one dot at a time
    </DissolveText>
  );
}
