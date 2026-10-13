import { BarChart } from "@/components/dithercn/bar-chart";

const data = [
  { current: 412_000, previous: 356_000, quarter: "Q1" },
  { current: 468_000, previous: 391_000, quarter: "Q2" },
  { current: 529_000, previous: 447_000, quarter: "Q3" },
  { current: 581_000, previous: 502_000, quarter: "Q4" },
];

export default function BarChartGrouped() {
  return (
    <div className="bg-background border-border w-full max-w-md rounded-2xl border p-5 [--dither-paper:var(--background)] sm:p-6">
      <div className="mb-5 flex flex-col gap-1">
        <span className="text-muted-foreground text-sm">
          Net revenue by quarter
        </span>
        <span className="text-3xl font-semibold tracking-tight">$1.99M</span>
        <span className="text-muted-foreground text-xs">
          <span className="text-foreground font-medium">+16.6%</span> on last
          year
        </span>
      </div>
      <BarChart
        data={data}
        x="quarter"
        highlight="none"
        fill="hatched"
        height={200}
        series={[
          { label: "2026", value: "current" },
          { label: "2025", value: "previous" },
        ]}
        format={{
          currency: "USD",
          maximumFractionDigits: 0,
          notation: "compact",
          style: "currency",
        }}
      />
    </div>
  );
}
