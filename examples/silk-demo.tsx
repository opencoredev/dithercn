"use client";

import { Silk } from "@/components/dithercn/silk";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/silk-controls";

export default function SilkDemo() {
  const tint = usePreviewValue(knobs.tint);
  const folds = usePreviewValue(knobs.folds);
  const sheen = usePreviewValue(knobs.sheen);
  const animate = usePreviewValue(knobs.animate);

  return (
    <Silk
      palette={["--dither-paper", toward(tint, 30), toward(tint, 70), tint]}
      folds={folds}
      sheen={sheen}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
