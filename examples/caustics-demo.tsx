"use client";

import { Caustics } from "@/components/dithercn/caustics";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/caustics-controls";

export default function CausticsDemo() {
  const tint = usePreviewValue(knobs.tint);
  const scale = usePreviewValue(knobs.scale);
  const focus = usePreviewValue(knobs.focus);
  const angle = usePreviewValue(knobs.angle);
  const mask = usePreviewValue(knobs.mask);
  const animate = usePreviewValue(knobs.animate);

  return (
    <Caustics
      palette={["--dither-paper", toward(tint, 22), toward(tint, 55), tint]}
      scale={scale}
      focus={focus}
      angle={angle}
      mask={mask}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
