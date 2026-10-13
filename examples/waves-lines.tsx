import { Waves } from "@/components/dithercn/waves";

export default function WavesLines() {
  return (
    <div className="bg-background border-border relative flex w-full max-w-sm [--dither-paper:var(--background)] flex-col gap-4 rounded-2xl border p-5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Episode 42: Cells</span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          12:08
        </span>
      </div>
      <div className="relative h-24 overflow-hidden rounded-lg">
        <Waves
          variant="lines"
          layers={4}
          cell={2}
          className="absolute inset-0"
        />
      </div>
    </div>
  );
}
