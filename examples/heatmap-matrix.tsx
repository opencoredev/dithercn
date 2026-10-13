import { Heatmap } from "@/components/dithercn/heatmap";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const HOURS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0")
);

const noise = (n: number) => {
  const x = Math.sin(n * 39.346 + 11.135) * 24_634.6345;
  return x - Math.floor(x);
};

// Pushes to main by weekday and hour: office hours, a dip at lunch, little on weekends.
const data = DAYS.map((_, day) =>
  HOURS.map((__, hour) => {
    const office = hour >= 9 && hour <= 18 ? 1 : 0.12;
    const lunch = hour === 12 || hour === 13 ? 0.55 : 1;
    const weekend = day >= 5 ? 0.18 : 1;
    const friday = day === 4 && hour >= 15 ? 0.4 : 1;
    return Math.round(
      40 *
        office *
        lunch *
        weekend *
        friday *
        (0.6 + noise(day * 24 + hour) * 0.6)
    );
  })
);

export default function HeatmapMatrix() {
  return (
    <div className="bg-background border-border w-full max-w-2xl rounded-2xl border p-5 [--dither-paper:var(--background)] sm:p-6">
      <div className="mb-6 flex flex-col gap-1">
        <span className="font-medium">When the team pushes to main</span>
        <span className="text-muted-foreground text-sm">
          Last 90 days, by weekday and hour (UTC). Fridays go quiet after 3pm.
        </span>
      </div>
      <Heatmap
        mode="matrix"
        data={data}
        rows={DAYS}
        columns={HOURS}
        cell={4}
        steps={5}
        color="orange"
        unit={{ one: "push", other: "pushes" }}
      />
    </div>
  );
}
