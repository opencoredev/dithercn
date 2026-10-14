import { Ridgelines } from "@/components/dithercn/ridgelines";

export default function RidgelinesSignal() {
  return (
    <div className="bg-background border-border relative flex w-full max-w-sm [--dither-paper:var(--background)] flex-col gap-4 rounded-2xl border p-5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">PSR B1919+21</span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          1.337 s
        </span>
      </div>
      <div className="relative h-48 overflow-hidden rounded-lg">
        <Ridgelines
          lines={24}
          spread={0.35}
          cell={2}
          className="absolute inset-0"
        />
      </div>
    </div>
  );
}
