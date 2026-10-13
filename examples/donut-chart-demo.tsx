"use client";

import { DonutChart } from "@/components/dithercn/donut-chart";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/donut-chart-controls";

const REGIONS = [
  { label: "North America", value: 48_210 },
  { label: "Europe", value: 31_870 },
  { label: "Asia Pacific", value: 17_430 },
  { label: "South America", value: 6340 },
  { label: "Africa", value: 2150 },
] as const;

export default function DonutChartDemo() {
  const mode = usePreviewValue(knobs.mode);
  const fill = usePreviewValue(knobs.fill);
  const bloom = usePreviewValue(knobs.bloom);
  const first = usePreviewValue(knobs.firstColor);
  const gap = usePreviewValue(knobs.gap);
  const animate = usePreviewValue(knobs.animate);

  return (
    <DonutChart
      data={REGIONS}
      label="Requests today"
      mode={mode}
      fill={fill}
      bloom={bloom}
      colors={[first, "orange", "green", "pink", "grey"]}
      gap={gap}
      animate={animate}
      size={232}
    />
  );
}
