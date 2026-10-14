"use client";

import { Contours } from "@/components/dithercn/contours";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/contours-controls";

export default function ContoursDemo() {
  const tint = usePreviewValue(knobs.tint);
  const lines = usePreviewValue(knobs.lines);
  const relief = usePreviewValue(knobs.relief);
  const animate = usePreviewValue(knobs.animate);

  return (
    <Contours
      palette={["--dither-paper", toward(tint, 40), tint]}
      lines={lines}
      relief={relief}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
