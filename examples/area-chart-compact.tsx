import { AreaChart } from "@/components/dithercn/area-chart";

const USERS = [
  6.1, 6.6, 6.4, 7.3, 7.9, 7.6, 8.8, 9.4, 9.1, 10.2, 10.9, 11.5, 11.3, 12.4,
];

const data = USERS.map((value, index) => ({
  users: value * 1000,
  week: `Week ${String(index + 27)}`,
}));

export default function AreaChartCompact() {
  return (
    <div className="bg-background border-border flex w-full max-w-xs flex-col overflow-hidden rounded-2xl border [--dither-paper:var(--background)]">
      <div className="flex flex-col gap-1 p-5 pb-3">
        <span className="text-muted-foreground text-sm">
          Weekly active users
        </span>
        <span className="text-3xl font-semibold tracking-tight">12.4K</span>
        <span className="text-muted-foreground text-xs">
          <span className="text-foreground font-medium">+8.1%</span> on last
          week
        </span>
      </div>
      <AreaChart
        data={data}
        x="week"
        series={[{ label: "Active users", value: "users" }]}
        axes={false}
        fill="dotted"
        curve="linear"
        height={96}
      />
    </div>
  );
}
