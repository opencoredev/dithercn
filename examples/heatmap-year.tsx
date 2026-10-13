import { Heatmap } from "@/components/dithercn/heatmap";

const END = Date.UTC(2026, 9, 12);
const DAY = 86_400_000;

const noise = (n: number) => {
  const x = Math.sin(n * 78.233 + 12.9898) * 43_758.5453;
  return x - Math.floor(x);
};

// Writing sessions in minutes: a seasonal swell, quiet Sundays, a break in August.
const data = Array.from({ length: 371 }, (_, index) => {
  const time = END - index * DAY;
  const date = new Date(time);
  const season = 0.55 + 0.45 * Math.sin((index / 365) * Math.PI * 2 + 1.2);
  const sunday = date.getUTCDay() === 0 ? 0.25 : 1;
  const holiday = date.getUTCMonth() === 7 && date.getUTCDate() < 15 ? 0 : 1;
  const minutes = Math.round(
    Math.max(0, season * sunday * holiday * 140 * noise(index) - 18)
  );
  return { date: date.toISOString().slice(0, 10), value: minutes };
});

const hours = Math.round(data.reduce((sum, day) => sum + day.value, 0) / 60);

export default function HeatmapYear() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="text-lg font-semibold tracking-tight">
          {hours.toLocaleString("en")} hours of writing this year
        </h3>
        <span className="text-muted-foreground font-mono text-xs">
          Oct 2025 to Oct 2026
        </span>
      </div>
      <Heatmap data={data} weekStart={1} color="purple" unit="min" />
    </div>
  );
}
