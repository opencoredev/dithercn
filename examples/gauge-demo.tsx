"use client";

import { Gauge } from "@/components/dithercn/gauge";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/gauge-controls";

export default function GaugeDemo() {
  const value = usePreviewValue(knobs.value);
  const variant = usePreviewValue(knobs.variant);
  const fill = usePreviewValue(knobs.fill);
  const color = usePreviewValue(knobs.tint);
  const bloom = usePreviewValue(knobs.bloom);

  return (
    <Gauge
      value={value}
      label="CPU load"
      unit="%"
      size={240}
      variant={variant}
      fill={fill}
      color={color}
      bloom={bloom}
    />
  );
}
