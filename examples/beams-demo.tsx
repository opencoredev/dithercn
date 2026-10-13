"use client";

import { Beams } from "@/components/dithercn/beams";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/beams-controls";

export default function BeamsDemo() {
  const tint = usePreviewValue(knobs.tint);
  const rays = usePreviewValue(knobs.rays);
  const spread = usePreviewValue(knobs.spread);
  const animate = usePreviewValue(knobs.animate);

  return (
    <Beams
      palette={["--dither-paper", tint]}
      rays={rays}
      spread={spread}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
