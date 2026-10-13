import { DonutChart } from "@/components/dithercn/donut-chart";

const STORAGE = [
  { color: "blue", label: "Images", value: 412 },
  { color: "purple", label: "Video", value: 268 },
  { color: "green", label: "Backups", value: 155 },
  { color: "grey", fill: "dotted", label: "Free", value: 165 },
] as const;

export default function DonutChartCard() {
  return (
    <div className="bg-background border-border w-full max-w-md rounded-2xl border p-5 [--dither-paper:var(--background)] sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-medium">Storage</span>
        <span className="text-muted-foreground font-mono text-xs">
          835 of 1,000 GB
        </span>
      </div>
      <DonutChart
        data={STORAGE}
        label="Capacity"
        unit=" GB"
        size={164}
        thickness={0.3}
        fill="hatched"
        className="mt-5 justify-start gap-x-6"
      />
    </div>
  );
}
