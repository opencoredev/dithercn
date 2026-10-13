import { AreaChart } from "@/components/dithercn/area-chart";

const REVENUE = [
  31.2, 32.8, 32.1, 34.6, 35.9, 35.1, 36.8, 38.4, 37.2, 39.9, 41.3, 40.2, 42.8,
  44.1, 43.5, 45.9, 47.2, 46.1, 48.2,
];

const data = REVENUE.map((value, index) => ({
  day: `Sep ${String(index + 12)}`,
  revenue: value * 1000,
}));

export default function AreaChartDemo() {
  return (
    <div className="bg-background border-border w-full max-w-xl rounded-2xl border p-5 [--dither-paper:var(--background)] sm:p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm">Revenue</span>
          <span className="text-3xl font-semibold tracking-tight">$48.2K</span>
        </div>
        <span className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium">+54.5%</span> since Sep
          12
        </span>
      </div>
      <AreaChart
        data={data}
        x="day"
        series={[{ label: "Revenue", value: "revenue" }]}
        format={{
          currency: "USD",
          maximumFractionDigits: 1,
          notation: "compact",
          style: "currency",
        }}
      />
    </div>
  );
}
