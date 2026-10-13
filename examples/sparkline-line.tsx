import { Sparkline } from "@/components/dithercn/sparkline";

const SERVICES = [
  {
    latency: [42, 44, 41, 43, 45, 44, 42, 46, 43, 44, 42, 43],
    name: "api",
    now: "43 ms",
    spiked: false,
  },
  {
    latency: [88, 91, 87, 95, 132, 171, 158, 121, 104, 97, 93, 90],
    name: "search",
    now: "90 ms",
    spiked: true,
  },
  {
    latency: [12, 12, 13, 12, 11, 12, 13, 12, 12, 11, 12, 12],
    name: "edge-cache",
    now: "12 ms",
    spiked: false,
  },
] as const;

export default function SparklineLine() {
  return (
    <ul className="bg-background border-border flex w-full max-w-sm flex-col rounded-2xl border p-2 [--dither-paper:var(--background)]">
      {SERVICES.map((service) => (
        <li
          key={service.name}
          className="flex items-center gap-4 rounded-xl px-3 py-2.5"
        >
          <span className="w-24 font-mono text-xs">{service.name}</span>
          <Sparkline
            data={service.latency}
            label={`${service.name} p50 latency, last hour`}
            area={false}
            color={service.spiked ? "--dither-ink" : "--muted-foreground"}
            height={20}
            className="flex-1"
          />
          <span className="w-12 text-right text-sm tabular-nums">
            {service.now}
          </span>
        </li>
      ))}
    </ul>
  );
}
