import { BarChart } from "@/components/dithercn/bar-chart";

const data = [
  { deploys: 38, week: "W27" },
  { deploys: 44, week: "W28" },
  { deploys: 41, week: "W29" },
  { deploys: 52, week: "W30" },
  { deploys: 47, week: "W31" },
  { deploys: 58, week: "W32" },
  { deploys: 55, week: "W33" },
  { deploys: 63, week: "W34" },
  { deploys: 49, week: "W35" },
  { deploys: 61, week: "W36" },
  { deploys: 68, week: "W37" },
  { deploys: 74, week: "W38" },
];

export default function BarChartDemo() {
  return (
    <div className="bg-background border-border w-full max-w-xl rounded-2xl border p-5 [--dither-paper:var(--background)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm">
            Deploys to production
          </span>
          <span className="text-3xl font-semibold tracking-tight">74</span>
        </div>
        <span className="text-muted-foreground text-sm">
          <span className="text-foreground font-medium">+8.8%</span> on last
          week
        </span>
      </div>
      <BarChart
        data={data}
        x="week"
        series={[{ label: "Deploys", value: "deploys" }]}
      />
    </div>
  );
}
