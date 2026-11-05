"use client";

import { Moire } from "@/components/dithercn/moire";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/moire-controls";

export default function MoireDemo() {
  const tint = usePreviewValue(knobs.tint);
  const variant = usePreviewValue(knobs.variant);
  const pitch = usePreviewValue(knobs.pitch);
  const bands = usePreviewValue(knobs.bands);
  const angle = usePreviewValue(knobs.angle);
  const drift = usePreviewValue(knobs.drift);
  const warp = usePreviewValue(knobs.warp);
  const animate = usePreviewValue(knobs.animate);

  return (
    <Moire
      palette={["--dither-paper", toward(tint, 40), tint]}
      variant={variant}
      pitch={pitch}
      bands={bands}
      angle={angle}
      drift={drift}
      warp={warp}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
