import { RadarChart } from "@/components/dithercn/radar-chart";

const AXES = ["Speed", "Access", "Practices", "SEO", "Uptime"] as const;

export default function RadarChartCard() {
  return (
    <div className="bg-background border-border flex w-full max-w-md flex-col gap-2 rounded-2xl border p-5 [--dither-paper:var(--background)] sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-medium">Site health</span>
        <span className="text-muted-foreground font-mono text-xs">
          dithercn.dev
        </span>
      </div>
      <span className="text-muted-foreground text-sm">
        Every score is above 80 except speed, held back by the hero video.
      </span>
      <RadarChart
        axes={AXES}
        series={[
          { color: "green", label: "Score", values: [64, 96, 92, 100, 99] },
        ]}
        max={100}
        grid="circle"
        fill="dotted"
        size={300}
        format={{ maximumFractionDigits: 0 }}
        className="mt-2"
      />
    </div>
  );
}
