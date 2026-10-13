import { BarChart } from "@/components/dithercn/bar-chart";

const data = [
  { day: "Mon", paid: 182, trial: 96 },
  { day: "Tue", paid: 204, trial: 118 },
  { day: "Wed", paid: 231, trial: 104 },
  { day: "Thu", paid: 219, trial: 131 },
  { day: "Fri", paid: 256, trial: 142 },
  { day: "Sat", paid: 141, trial: 77 },
  { day: "Sun", paid: 128, trial: 69 },
];

export default function BarChartStacked() {
  return (
    <div className="bg-background border-border w-full max-w-xl rounded-2xl border p-5 [--dither-paper:var(--background)] sm:p-6">
      <div className="mb-5 flex flex-col gap-1">
        <span className="text-muted-foreground text-sm">Signups this week</span>
        <span className="text-3xl font-semibold tracking-tight">2,098</span>
      </div>
      <BarChart
        data={data}
        x="day"
        layout="stacked"
        highlight="max"
        series={[
          { label: "Paid", value: "paid" },
          { label: "Trial", value: "trial" },
        ]}
        format={{ maximumFractionDigits: 0 }}
      />
    </div>
  );
}
