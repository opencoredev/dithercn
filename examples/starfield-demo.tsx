"use client";

import { Starfield } from "@/components/dithercn/starfield";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/starfield-controls";

export default function StarfieldDemo() {
  const tint = usePreviewValue(knobs.tint);
  const density = usePreviewValue(knobs.density);
  const twinkle = usePreviewValue(knobs.twinkle);
  const animate = usePreviewValue(knobs.animate);

  return (
    <Starfield
      palette={["--dither-paper", toward(tint, 50), tint]}
      density={density}
      twinkle={twinkle}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
