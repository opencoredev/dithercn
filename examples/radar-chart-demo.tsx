"use client";

import { RadarChart } from "@/components/dithercn/radar-chart";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/radar-chart-controls";

const AXES = [
  "Reasoning",
  "Coding",
  "Math",
  "Writing",
  "Vision",
  "Speed",
] as const;

export default function RadarChartDemo() {
  const fill = usePreviewValue(knobs.fill);
  const bloom = usePreviewValue(knobs.bloom);
  const grid = usePreviewValue(knobs.grid);
  const first = usePreviewValue(knobs.firstColor);
  const rings = usePreviewValue(knobs.rings);
  const interactive = usePreviewValue(knobs.interactive);

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-2">
      <span className="text-muted-foreground font-mono text-[11px] tracking-[0.08em] uppercase">
        Eval scores, out of 100
      </span>
      <RadarChart
        axes={AXES}
        series={[
          { color: first, label: "Model v3", values: [86, 91, 78, 72, 64, 58] },
          { label: "Model v2", values: [71, 74, 69, 76, 40, 82] },
        ]}
        max={100}
        fill={fill}
        bloom={bloom}
        grid={grid}
        rings={rings}
        interactive={interactive}
        size={380}
      />
    </div>
  );
}
