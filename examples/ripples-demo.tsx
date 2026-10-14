"use client";

import { Ripples } from "@/components/dithercn/ripples";
import type { RipplesSource } from "@/components/dithercn/ripples";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/ripples-controls";

const POINTS: readonly RipplesSource[] = [
  [0.28, 0.38],
  [0.74, 0.66],
  [0.62, 0.18],
  [0.18, 0.86],
];

export default function RipplesDemo() {
  const tint = usePreviewValue(knobs.tint);
  const sources = usePreviewValue(knobs.sources);
  const rings = usePreviewValue(knobs.rings);
  const animate = usePreviewValue(knobs.animate);

  return (
    <Ripples
      palette={["--dither-paper", toward(tint, 45), tint]}
      sources={POINTS.slice(0, sources)}
      rings={rings}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
