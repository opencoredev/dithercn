import { Divider } from "@/components/dithercn/divider";

const STATS = [
  { label: "Requests", value: "1.28M" },
  { label: "p95 latency", value: "184ms" },
  { label: "Error rate", value: "0.04%" },
];

export default function DividerVertical() {
  return (
    <div className="bg-background flex h-24 w-full max-w-xl items-stretch rounded-2xl border px-2 py-4">
      {STATS.map((stat, index) => (
        <div key={stat.label} className="contents">
          {index > 0 ? (
            <Divider
              orientation="vertical"
              color="--foreground"
              strength={0.4}
              thickness={1}
            />
          ) : null}
          <div className="flex flex-1 flex-col justify-center px-4 sm:px-6">
            <span className="text-muted-foreground text-xs">{stat.label}</span>
            <span className="text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
              {stat.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
