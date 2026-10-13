"use client";

import { Aurora } from "@/components/dithercn/aurora";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/aurora-controls";

export default function AuroraDemo() {
  return (
    <Aurora
      color={usePreviewValue(knobs.tint)}
      tipColor={usePreviewValue(knobs.tip)}
      curtains={usePreviewValue(knobs.curtains)}
      height={usePreviewValue(knobs.height)}
      spread={usePreviewValue(knobs.spread)}
      sway={usePreviewValue(knobs.sway)}
      turbulence={usePreviewValue(knobs.turbulence)}
      rays={usePreviewValue(knobs.rays)}
      length={usePreviewValue(knobs.length)}
      glow={usePreviewValue(knobs.glow)}
      tilt={usePreviewValue(knobs.tilt)}
      drift={usePreviewValue(knobs.drift)}
      direction={usePreviewValue(knobs.direction)}
      mask={usePreviewValue(knobs.mask)}
      matrix={usePreviewValue(knobs.matrix)}
      cell={usePreviewValue(knobs.cell)}
      animate={usePreviewValue(knobs.animate)}
      className="absolute inset-0"
    />
  );
}
