"use client";

import { Smoke } from "@/components/dithercn/smoke";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/smoke-controls";

export default function SmokeDemo() {
  const tint = usePreviewValue(knobs.tint);
  const scale = usePreviewValue(knobs.scale);
  const wind = usePreviewValue(knobs.wind);
  const animate = usePreviewValue(knobs.animate);

  return (
    <Smoke
      palette={["--dither-paper", toward(tint, 45), tint]}
      scale={scale}
      wind={wind}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
