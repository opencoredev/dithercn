"use client";

import { RetroGrid } from "@/components/dithercn/retro-grid";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/retro-grid-controls";

export default function RetroGridDemo() {
  const tint = usePreviewValue(knobs.tint);
  const horizon = usePreviewValue(knobs.horizon);
  const sun = usePreviewValue(knobs.sun);
  const animate = usePreviewValue(knobs.animate);

  return (
    <RetroGrid
      palette={["--dither-paper", toward(tint, 30), toward(tint, 65), tint]}
      horizon={horizon}
      sun={sun}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
