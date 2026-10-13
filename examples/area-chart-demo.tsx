"use client";

import { AreaChart } from "@/components/dithercn/area-chart";
import { usePreviewValue } from "@/components/preview-controls";
import { areaChartControls as knobs } from "@/examples/area-chart-controls";

// Thirty days of visitors: a steady climb with a weekly rhythm.
const data = Array.from({ length: 30 }, (_, index) => {
  const week = Math.sin((index / 7) * Math.PI * 2);
  return {
    day: `Sep ${String(index + 1)}`,
    direct: Math.round(190 + index * 6.8 + week * 14),
    search: Math.round(
      410 + index * 15.4 + week * 38 + Math.sin(index / 4) * 22
    ),
  };
});

export default function AreaChartDemo() {
  const fill = usePreviewValue(knobs.fill);
  const stack = usePreviewValue(knobs.stack);
  const bloom = usePreviewValue(knobs.bloom);
  const color = usePreviewValue(knobs.color);
  const cell = usePreviewValue(knobs.cell);
  const interactive = usePreviewValue(knobs.interactive);

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground font-mono text-[11px] tracking-[0.08em] uppercase">
            Visitors, September
          </span>
          <span className="text-3xl font-semibold tracking-tight tabular-nums">
            1,258
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              today
            </span>
          </span>
        </div>
        <span className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium">+109%</span> since Sep 1
        </span>
      </div>
      <AreaChart
        data={data}
        x="day"
        series={[
          { color, label: "Search", value: "search" },
          { label: "Direct", value: "direct" },
        ]}
        fill={fill}
        stack={stack}
        bloom={bloom}
        cell={cell}
        interactive={interactive}
        height={260}
      />
    </div>
  );
}
