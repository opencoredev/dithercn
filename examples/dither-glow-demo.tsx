"use client";

import { DitherGlow } from "@/components/dithercn/dither-glow";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/dither-glow-controls";

export default function DitherGlowDemo() {
  const tint = usePreviewValue(knobs.tint);
  const position = usePreviewValue(knobs.position);
  const intensity = usePreviewValue(knobs.intensity);
  const radius = usePreviewValue(knobs.radius);
  const animate = usePreviewValue(knobs.animate);

  return (
    <DitherGlow
      palette={["--dither-paper", tint]}
      position={position}
      intensity={intensity}
      radius={radius}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
