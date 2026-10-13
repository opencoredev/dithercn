import { LineChart } from "@/components/dithercn/line-chart";

const P50 = [
  188, 184, 191, 186, 179, 182, 196, 214, 205, 193, 187, 181, 178, 183, 190,
  186, 181, 177, 180, 184, 182,
];
const SPREAD = [
  31, 29, 34, 30, 27, 28, 41, 63, 52, 38, 32, 29, 27, 30, 33, 31, 28, 26, 27,
  30, 28,
];

const data = P50.map((p50, index) => {
  const spread = SPREAD[index] ?? 30;
  return {
    p10: p50 - spread * 0.7,
    p50,
    p90: p50 + spread * 1.6,
    time: `${String(12 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 === 0 ? "00" : "30"}`,
  };
});

export default function LineChartDemo() {
  return (
    <div className="bg-background border-border w-full max-w-xl rounded-2xl border p-5 [--dither-paper:var(--background)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm">
            API latency, median
          </span>
          <span className="text-3xl font-semibold tracking-tight">182 ms</span>
        </div>
        <span className="text-muted-foreground text-sm">Band: p10 to p90</span>
      </div>
      <LineChart
        data={data}
        x="time"
        series={[
          {
            label: "p50",
            range: { high: "p90", low: "p10" },
            value: "p50",
          },
        ]}
        format={{
          maximumFractionDigits: 0,
          style: "unit",
          unit: "millisecond",
          unitDisplay: "narrow",
        }}
      />
    </div>
  );
}
