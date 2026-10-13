"use client";

import { Horizon } from "@/components/dithercn/horizon";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/horizon-controls";

export default function HorizonDemo() {
  const tint = usePreviewValue(knobs.tint);
  const aurora = usePreviewValue(knobs.aurora);
  const stars = usePreviewValue(knobs.stars);
  const animate = usePreviewValue(knobs.animate);

  return (
    <Horizon
      glowColor={tint}
      aurora={aurora}
      stars={stars}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
