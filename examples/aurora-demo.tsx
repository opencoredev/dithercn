"use client";

import { Aurora } from "@/components/dithercn/aurora";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/aurora-controls";
import { toward } from "@/examples/background-tint";

export default function AuroraDemo() {
  const tint = usePreviewValue(knobs.tint);
  const height = usePreviewValue(knobs.height);
  const sway = usePreviewValue(knobs.sway);
  const animate = usePreviewValue(knobs.animate);

  return (
    <Aurora
      palette={[
        "--dither-paper",
        toward(tint, 30),
        toward(tint, 70),
        tint,
        toward(tint, 50, "--foreground"),
      ]}
      height={height}
      sway={sway}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
