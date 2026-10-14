"use client";

import { Ridgelines } from "@/components/dithercn/ridgelines";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/ridgelines-controls";

export default function RidgelinesDemo() {
  const tint = usePreviewValue(knobs.tint);
  const lines = usePreviewValue(knobs.lines);
  const amplitude = usePreviewValue(knobs.amplitude);
  const animate = usePreviewValue(knobs.animate);

  return (
    <Ridgelines
      palette={["--dither-paper", tint]}
      lines={lines}
      amplitude={amplitude}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
