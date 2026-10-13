import { LineChart } from "@/components/dithercn/line-chart";

// The benchmark band is the middle half of companies in the same sector.
const data = [
  { high: 41, low: 28, month: "Apr", score: 31 },
  { high: 41, low: 28, month: "May", score: 34 },
  { high: 42, low: 29, month: "Jun", score: 33 },
  { high: 42, low: 29, month: "Jul", score: 39 },
  { high: 43, low: 30, month: "Aug", score: 42 },
  { high: 43, low: 30, month: "Sep", score: 47 },
];

export default function LineChartPoints() {
  return (
    <div className="bg-background border-border w-full max-w-sm rounded-2xl border p-5 [--dither-paper:var(--background)]">
      <div className="mb-4 flex flex-col gap-1">
        <span className="text-muted-foreground text-sm">
          Net promoter score
        </span>
        <span className="text-3xl font-semibold tracking-tight">47</span>
        <span className="text-muted-foreground text-xs">
          <span className="text-foreground font-medium">+16</span> since April,
          now above the sector benchmark
        </span>
      </div>
      <LineChart
        data={data}
        x="month"
        markers="all"
        curve="linear"
        height={180}
        zero
        series={[
          {
            label: "NPS",
            range: {
              color: "--muted-foreground",
              high: "high",
              low: "low",
            },
            value: "score",
          },
        ]}
      />
    </div>
  );
}
