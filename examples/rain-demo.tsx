"use client";

import { Rain } from "@/components/dithercn/rain";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/rain-controls";

export default function RainDemo() {
  return (
    <Rain
      palette={[
        "--dither-paper",
        usePreviewValue(knobs.tint),
        usePreviewValue(knobs.second),
      ]}
      drops={usePreviewValue(knobs.drops)}
      glow={usePreviewValue(knobs.glow)}
      scale={usePreviewValue(knobs.scale)}
      fade={usePreviewValue(knobs.fade)}
      animate={usePreviewValue(knobs.animate)}
      className="absolute inset-0"
    />
  );
}
