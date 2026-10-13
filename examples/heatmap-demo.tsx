import { Heatmap } from "@/components/dithercn/heatmap";

const END = Date.UTC(2026, 9, 12);
const DAY = 86_400_000;

/** A repeatable pseudo-random value in [0, 1) for day `n`. */
const noise = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43_758.5453;
  return x - Math.floor(x);
};

// Quieter weekends, a busier stretch before a launch, and a few gaps.
const data = Array.from({ length: 26 * 7 }, (_, index) => {
  const time = END - index * DAY;
  const weekday = new Date(time).getUTCDay();
  const weekend = weekday === 0 || weekday === 6;
  const launch = index > 20 && index < 45 ? 6 : 0;
  const base = weekend ? 1.2 : 5 + launch;
  const value = Math.max(0, Math.round(base * noise(index) * 2 - 1.5));
  return { date: new Date(time).toISOString().slice(0, 10), value };
});

const total = data.reduce((sum, day) => sum + day.value, 0);

export default function HeatmapDemo() {
  return (
    <div className="bg-background border-border w-full max-w-xl rounded-2xl border p-5 [--dither-paper:var(--background)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-sm">
            Deploys, last 6 months
          </span>
          <span className="text-3xl font-semibold tracking-tight">
            {total.toLocaleString("en")}
          </span>
        </div>
      </div>
      <Heatmap
        data={data}
        weeks={26}
        unit={{ one: "deploy", other: "deploys" }}
      />
    </div>
  );
}
