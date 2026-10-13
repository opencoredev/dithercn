import { AreaChart } from "@/components/dithercn/area-chart";

const HOURS = [
  [212, 58],
  [188, 61],
  [164, 49],
  [151, 44],
  [149, 47],
  [176, 52],
  [248, 71],
  [341, 96],
  [422, 118],
  [468, 131],
  [489, 127],
  [502, 140],
  [497, 138],
  [511, 151],
  [488, 133],
  [463, 129],
  [452, 121],
  [431, 117],
  [398, 109],
  [366, 97],
  [344, 92],
  [318, 84],
  [276, 73],
  [241, 66],
] as const;

const data = HOURS.map(([cached, origin], hour) => ({
  cached,
  hour: `${String(hour).padStart(2, "0")}:00`,
  origin,
}));

export default function AreaChartLayered() {
  return (
    <div className="bg-background border-border w-full max-w-xl rounded-2xl border p-5 [--dither-paper:var(--background)] sm:p-6">
      <div className="mb-5 flex flex-col gap-1">
        <span className="text-muted-foreground text-sm">
          Requests per second, last 24 hours
        </span>
        <span className="text-3xl font-semibold tracking-tight">
          78%{" "}
          <span className="text-muted-foreground text-base font-normal">
            served from cache
          </span>
        </span>
      </div>
      <AreaChart
        data={data}
        x="hour"
        series={[
          { label: "Cached", value: "cached" },
          { label: "Origin", value: "origin" },
        ]}
        height={220}
      />
    </div>
  );
}
