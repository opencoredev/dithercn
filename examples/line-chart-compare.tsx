import { LineChart } from "@/components/dithercn/line-chart";

const data = [
  { day: "Mon", lastWeek: 1240, thisWeek: 1310 },
  { day: "Tue", lastWeek: 1380, thisWeek: 1520 },
  { day: "Wed", lastWeek: 1410, thisWeek: 1490 },
  { day: "Thu", lastWeek: 1350, thisWeek: 1640 },
  { day: "Fri", lastWeek: 1520, thisWeek: 1810 },
  { day: "Sat", lastWeek: 980, thisWeek: 1160 },
  { day: "Sun", lastWeek: 910, thisWeek: 1090 },
];

export default function LineChartCompare() {
  return (
    <div className="bg-background border-border w-full max-w-xl rounded-2xl border p-5 [--dither-paper:var(--background)] sm:p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm">Checkouts</span>
          <span className="text-3xl font-semibold tracking-tight">10,020</span>
        </div>
        <span className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium">+13.4%</span> on last
          week
        </span>
      </div>
      <LineChart
        data={data}
        x="day"
        height={220}
        series={[
          {
            label: "This week",
            range: { high: "thisWeek", low: "lastWeek" },
            value: "thisWeek",
          },
          { dashed: true, label: "Last week", value: "lastWeek" },
        ]}
      />
    </div>
  );
}
