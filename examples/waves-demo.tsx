"use client";

import { Waves } from "@/components/dithercn/waves";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/waves-controls";

export default function WavesDemo() {
  const tint = usePreviewValue(knobs.tint);
  const variant = usePreviewValue(knobs.variant);
  const amplitude = usePreviewValue(knobs.amplitude);
  const animate = usePreviewValue(knobs.animate);

  return (
    <Waves
      variant={variant}
      palette={[
        "--dither-paper",
        toward(tint, 35),
        tint,
        toward(tint, 45, "--foreground"),
      ]}
      amplitude={amplitude}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
