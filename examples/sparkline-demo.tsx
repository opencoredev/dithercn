import { Sparkline } from "@/components/dithercn/sparkline";

const STATS = [
  {
    data: [41, 43, 42, 46, 48, 47, 51, 54, 53, 57, 60, 63],
    delta: "+11.9%",
    label: "Recurring revenue",
    value: "$63.2K",
  },
  {
    data: [8.1, 8.4, 8.2, 8.9, 9.6, 9.3, 10.4, 10.9, 10.6, 11.4, 11.9, 12.4],
    delta: "+8.1%",
    label: "Weekly active users",
    value: "12.4K",
  },
  {
    data: [3.9, 3.7, 3.8, 3.4, 3.5, 3.1, 3.2, 2.9, 2.8, 2.9, 2.6, 2.4],
    delta: "−0.4 pts",
    label: "Monthly churn",
    value: "2.4%",
  },
] as const;

export default function SparklineDemo() {
  return (
    <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
      {STATS.map((stat) => (
        <div
          key={stat.label}
          className="bg-background border-border flex flex-col gap-1 rounded-2xl border p-4 [--dither-paper:var(--background)]"
        >
          <span className="text-muted-foreground truncate text-sm">
            {stat.label}
          </span>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tracking-tight">
              {stat.value}
            </span>
            <span className="text-foreground text-xs font-medium">
              {stat.delta}
            </span>
          </div>
          <Sparkline
            data={stat.data}
            label={`${stat.label}, last 12 months`}
            height={40}
            className="mt-3"
          />
        </div>
      ))}
    </div>
  );
}
