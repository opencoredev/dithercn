"use client";

import { MeshGradient } from "@/components/dithercn/mesh-gradient";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/mesh-gradient-controls";

export default function MeshGradientDemo() {
  const tint = usePreviewValue(knobs.tint);
  const size = usePreviewValue(knobs.size);
  const animate = usePreviewValue(knobs.animate);

  return (
    <MeshGradient
      palette={[
        "--dither-paper",
        toward(tint, 30),
        toward(tint, 60, "pink"),
        tint,
        toward(tint, 55, "--foreground"),
      ]}
      size={size}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
