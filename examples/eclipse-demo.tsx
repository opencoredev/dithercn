"use client";

import { Eclipse } from "@/components/dithercn/eclipse";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/eclipse-controls";

export default function EclipseDemo() {
  const tint = usePreviewValue(knobs.tint);
  const size = usePreviewValue(knobs.size);
  const corona = usePreviewValue(knobs.corona);
  const animate = usePreviewValue(knobs.animate);

  return (
    <Eclipse
      rimColor={tint}
      size={size}
      corona={corona}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
