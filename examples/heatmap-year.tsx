import { Heatmap } from "@/components/dithercn/heatmap";

const END = Date.UTC(2026, 9, 12);
const DAY = 86_400_000;

const noise = (n: number) => {
  const x = Math.sin(n * 78.233 + 12.9898) * 43_758.5453;
  return x - Math.floor(x);
};

// Writing sessions in minutes: a seasonal swell plus day-to-day noise.
const data = Array.from({ length: 365 }, (_, index) => {
  const time = END - index * DAY;
  const season = 0.55 + 0.45 * Math.sin((index / 365) * Math.PI * 2 + 1.2);
  const minutes = Math.round(Math.max(0, season * 120 * noise(index) - 12));
  return { date: new Date(time).toISOString().slice(0, 10), value: minutes };
});

export default function HeatmapYear() {
  return (
    <div className="bg-background border-border w-full max-w-3xl rounded-2xl border p-5 [--dither-paper:var(--background)] sm:p-6">
      <div className="mb-5 flex flex-col gap-1">
        <span className="text-muted-foreground text-sm">
          Minutes written, last 12 months
        </span>
        <span className="text-3xl font-semibold tracking-tight">
          {Math.round(
            data.reduce((sum, day) => sum + day.value, 0) / 60
          ).toLocaleString("en")}{" "}
          <span className="text-muted-foreground text-base font-normal">
            hours
          </span>
        </span>
      </div>
      <Heatmap data={data} steps={16} weekStart={1} cell={2} unit="min" />
    </div>
  );
}
