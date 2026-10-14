"use client";

import { Metaballs } from "@/components/dithercn/metaballs";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/metaballs-controls";

export default function MetaballsDemo() {
  const tint = usePreviewValue(knobs.tint);
  const variant = usePreviewValue(knobs.variant);
  const count = usePreviewValue(knobs.count);
  const animate = usePreviewValue(knobs.animate);

  return (
    <Metaballs
      palette={["--dither-paper", toward(tint, 45), tint]}
      variant={variant}
      count={count}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
