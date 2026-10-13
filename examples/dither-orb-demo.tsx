"use client";

import { DitherOrb } from "@/components/dithercn/dither-orb";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/dither-orb-controls";

export default function DitherOrbDemo() {
  const color = usePreviewValue(knobs.ink);
  const size = usePreviewValue(knobs.size);
  const morph = usePreviewValue(knobs.morph);
  const lean = usePreviewValue(knobs.lean);
  const cell = usePreviewValue(knobs.cell);
  const shine = usePreviewValue(knobs.shine);
  const animate = usePreviewValue(knobs.animate);

  return (
    <DitherOrb
      color={color}
      highlight={shine ? toward(color, 30, "#fff") : undefined}
      size={size}
      morph={morph}
      lean={lean}
      cell={cell}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
