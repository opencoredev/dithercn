"use client";

import { Tunnel } from "@/components/dithercn/tunnel";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/tunnel-controls";

export default function TunnelDemo() {
  const tint = usePreviewValue(knobs.tint);
  const shape = usePreviewValue(knobs.shape);
  const rings = usePreviewValue(knobs.rings);
  const animate = usePreviewValue(knobs.animate);

  return (
    <Tunnel
      palette={["--dither-paper", tint]}
      shape={shape}
      rings={rings}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
