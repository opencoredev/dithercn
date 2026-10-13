"use client";

import { Halftone } from "@/components/dithercn/halftone";
import type {
  HalftoneInk,
  HalftoneSource,
} from "@/components/dithercn/halftone";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/halftone-controls";

export default function HalftoneDemo() {
  const mode = usePreviewValue(knobs.source);
  const inkCount = usePreviewValue(knobs.inks);
  const color = usePreviewValue(knobs.ink);
  const size = usePreviewValue(knobs.size);
  const angle = usePreviewValue(knobs.angle);
  const intensity = usePreviewValue(knobs.intensity);
  const drift = usePreviewValue(knobs.drift);
  const animate = usePreviewValue(knobs.animate);

  const sources: Record<typeof mode, HalftoneSource> = {
    linear: { direction: 60, source: "linear" },
    noise: { source: "noise" },
    radial: { center: [0.3, 0.75], radius: 1.1, source: "radial" },
  };
  // One ink follows the swatch; two and three are print-style sets.
  const inks: Record<typeof inkCount, HalftoneInk> = {
    one: { color },
    three: { channels: ["blue", "pink", "orange"] },
    two: { channels: [color, "pink"] },
  };
  const source = sources[mode];
  const ink = inks[inkCount];

  return (
    <Halftone
      {...source}
      {...ink}
      size={size}
      angle={angle}
      intensity={intensity}
      drift={drift}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
