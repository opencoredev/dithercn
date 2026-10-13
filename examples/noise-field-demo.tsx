"use client";

import { NoiseField } from "@/components/dithercn/noise-field";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/noise-field-controls";

export default function NoiseFieldDemo() {
  const tint = usePreviewValue(knobs.tint);
  const mask = usePreviewValue(knobs.mask);
  const scale = usePreviewValue(knobs.scale);
  const contrast = usePreviewValue(knobs.contrast);
  const animate = usePreviewValue(knobs.animate);

  return (
    <NoiseField
      palette={["--dither-paper", tint]}
      mask={mask}
      scale={scale}
      contrast={contrast}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
