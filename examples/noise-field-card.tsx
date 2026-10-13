import { NoiseField } from "@/components/dithercn/noise-field";

export default function NoiseFieldCard() {
  return (
    <div className="bg-background border-border relative isolate flex w-full max-w-sm [--dither-paper:var(--background)] flex-col gap-6 overflow-hidden rounded-2xl border p-5">
      <NoiseField
        scale={5}
        intensity={0.45}
        mask="top"
        cell={2}
        className="absolute inset-0 -z-10"
      />
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Requests / min</span>
        <span className="text-muted-foreground font-mono text-xs">live</span>
      </div>
      <span className="text-4xl font-semibold tracking-tight tabular-nums">
        48.2k
      </span>
      <span className="text-muted-foreground mt-6 text-xs">
        p95 latency 112 ms
      </span>
    </div>
  );
}
