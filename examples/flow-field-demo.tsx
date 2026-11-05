"use client";

import { FlowField } from "@/components/dithercn/flow-field";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/flow-field-controls";

export default function FlowFieldDemo() {
  const tint = usePreviewValue(knobs.tint);
  const variant = usePreviewValue(knobs.variant);
  const density = usePreviewValue(knobs.density);
  const trail = usePreviewValue(knobs.trail);
  const turbulence = usePreviewValue(knobs.turbulence);
  const angle = usePreviewValue(knobs.angle);
  const animate = usePreviewValue(knobs.animate);

  return (
    <FlowField
      palette={["--dither-paper", toward(tint, 40), tint]}
      variant={variant}
      density={density}
      trail={trail}
      turbulence={turbulence}
      angle={angle}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
