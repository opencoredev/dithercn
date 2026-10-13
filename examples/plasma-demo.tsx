"use client";

import { Plasma } from "@/components/dithercn/plasma";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/plasma-controls";

export default function PlasmaDemo() {
  const tint = usePreviewValue(knobs.tint);
  const scale = usePreviewValue(knobs.scale);
  const warp = usePreviewValue(knobs.warp);
  const animate = usePreviewValue(knobs.animate);

  return (
    <Plasma
      palette={["--dither-paper", toward(tint, 45), tint]}
      scale={scale}
      warp={warp}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
