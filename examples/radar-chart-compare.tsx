import { RadarChart } from "@/components/dithercn/radar-chart";

const AXES = [
  "Price",
  "Seats",
  "Storage",
  "Support",
  "Audit log",
  "SSO",
  "API limits",
] as const;

export default function RadarChartCompare() {
  return (
    <section className="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="text-muted-foreground font-mono text-[11px] tracking-[0.08em] uppercase">
          Plans
        </span>
        <h3 className="max-w-md text-2xl font-semibold tracking-tight text-balance">
          Team covers what most companies need. Enterprise covers the rest.
        </h3>
      </div>
      <RadarChart
        axes={AXES}
        series={[
          { label: "Starter", values: [10, 2, 3, 3, 1, 0, 3] },
          { label: "Team", values: [7, 6, 6, 6, 6, 4, 6] },
          { label: "Enterprise", values: [3, 10, 10, 10, 10, 10, 10] },
        ]}
        colors={["grey", "orange", "purple"]}
        max={10}
        rings={5}
        fill="hatched"
        bloom="high"
        size={420}
      />
    </section>
  );
}
