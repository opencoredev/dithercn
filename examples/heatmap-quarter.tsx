import { Heatmap } from "@/components/dithercn/heatmap";

const END = Date.UTC(2026, 9, 12);
const DAY = 86_400_000;

const noise = (n: number) => {
  const x = Math.sin(n * 39.346 + 11.135) * 24_634.6345;
  return x - Math.floor(x);
};

// Incidents per day. One bad week would wash out every other day, so
// `max` caps the scale at 4 and anything above draws solid.
const data = Array.from({ length: 13 * 7 }, (_, index) => {
  const time = END - index * DAY;
  const outage = index >= 38 && index <= 41 ? 9 : 0;
  const value =
    outage + (noise(index) > 0.72 ? Math.ceil(noise(index + 400) * 3) : 0);
  return { date: new Date(time).toISOString().slice(0, 10), value };
});

export default function HeatmapQuarter() {
  return (
    <div className="bg-background border-border flex w-full max-w-sm flex-col gap-4 rounded-2xl border p-5 [--dither-paper:var(--background)]">
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-sm">
          Incidents, last 13 weeks
        </span>
        <span className="text-3xl font-semibold tracking-tight">
          {data.reduce((sum, day) => sum + day.value, 0)}
        </span>
      </div>
      <Heatmap
        data={data}
        weeks={13}
        max={4}
        color="--chart-3"
        unit={{ one: "incident", other: "incidents" }}
      />
    </div>
  );
}
