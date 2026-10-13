import { DonutChart } from "@/components/dithercn/donut-chart";

const STORAGE = [
  { label: "Images", value: 412 },
  { label: "Video", value: 268 },
  { label: "Backups", value: 155 },
  { label: "Logs", value: 61 },
] as const;

export default function DonutChartCard() {
  return (
    <div className="bg-background w-full max-w-md rounded-xl border p-5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-medium">Storage</span>
        <span className="text-muted-foreground text-sm">of 1,000 GB</span>
      </div>
      <DonutChart
        data={STORAGE}
        label="used"
        unit=" GB"
        size={148}
        thickness={20}
        className="mt-5 justify-start gap-x-8"
      />
    </div>
  );
}
