"use client";

import { Voronoi } from "@/components/dithercn/voronoi";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/voronoi-controls";

export default function VoronoiDemo() {
  const tint = usePreviewValue(knobs.tint);
  const variant = usePreviewValue(knobs.variant);
  const scale = usePreviewValue(knobs.scale);
  const wall = usePreviewValue(knobs.wall);
  const drift = usePreviewValue(knobs.drift);
  const animate = usePreviewValue(knobs.animate);

  return (
    <Voronoi
      palette={["--dither-paper", toward(tint, 45), tint]}
      variant={variant}
      scale={scale}
      wall={wall}
      drift={drift}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
