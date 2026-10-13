import { DonutChart } from "@/components/dithercn/donut-chart";

const BROWSERS = [
  { label: "Chrome", value: 6120 },
  { label: "Safari", value: 2840 },
  { label: "Firefox", value: 790 },
  { label: "Edge", value: 520 },
  { label: "Other", value: 310 },
] as const;

export default function DonutChartPie() {
  return (
    <section className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="text-muted-foreground font-mono text-[11px] tracking-[0.08em] uppercase">
          Where readers come from
        </span>
        <h3 className="max-w-md text-2xl font-semibold tracking-tight text-balance">
          Most of the docs traffic is on Chrome, so that is where we test first.
        </h3>
      </div>
      <DonutChart
        data={BROWSERS}
        label="Sessions this month"
        mode="pie"
        colors={["blue", "orange", "pink", "purple", "grey"]}
        bloom="high"
        size={248}
        gap={2}
      />
    </section>
  );
}
