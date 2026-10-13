"use client";

import { StatCard } from "@/components/dithercn/stat-card";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/stat-card-controls";

const REVENUE = [
  31.2, 32.8, 32.1, 34.6, 35.9, 35.2, 37.8, 39.4, 38.7, 41.2, 43.9, 42.8, 45.1,
  48.2,
] as const;

export default function StatCardDemo() {
  const fill = usePreviewValue(knobs.fill);
  const color = usePreviewValue(knobs.tint);
  const bloom = usePreviewValue(knobs.bloom);
  const good = usePreviewValue(knobs.good);

  return (
    <StatCard
      label="Monthly recurring revenue"
      value="$48,210"
      delta={12.4}
      deltaLabel="vs last month"
      trend={REVENUE}
      fill={fill}
      color={color}
      bloom={bloom}
      good={good}
      className="bg-background w-full max-w-xs"
    />
  );
}
