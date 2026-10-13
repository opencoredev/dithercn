import { Gauge } from "@/components/dithercn/gauge";

const HOSTS = [
  { label: "CPU", value: 42 },
  { label: "Memory", value: 71 },
  { label: "Disk", value: 93 },
] as const;

export default function GaugeDial() {
  return (
    <div className="bg-background border-border w-full max-w-xl rounded-2xl border p-5 [--dither-paper:var(--background)] sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-medium">db-primary-01</span>
        <span className="text-muted-foreground font-mono text-xs">
          eu-west-1
        </span>
      </div>
      <div className="mt-6 flex flex-wrap justify-around gap-6">
        {HOSTS.map(({ label, value }) => (
          <Gauge
            key={label}
            variant="dial"
            value={value}
            label={label}
            unit="%"
            size={136}
            color={value > 90 ? "red" : "blue"}
            fill={value > 90 ? "hatched" : "gradient"}
            bloom={value > 90 ? "low" : "off"}
          />
        ))}
      </div>
    </div>
  );
}
