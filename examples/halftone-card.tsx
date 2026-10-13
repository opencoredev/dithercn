import { Halftone } from "@/components/dithercn/halftone";

export default function HalftoneCard() {
  return (
    <div className="bg-background relative isolate flex w-full max-w-xs [--dither-paper:var(--background)] flex-col gap-1 overflow-hidden rounded-2xl p-5">
      <Halftone
        source="linear"
        direction={110}
        rotation={15}
        spacing={9}
        intensity={0.85}
        palette={["--dither-paper", "--chart-5", "--chart-4", "--chart-1"]}
        animate={false}
        className="absolute inset-y-0 right-0 -z-10 w-3/5"
      />
      <span className="text-muted-foreground text-sm">Print runs</span>
      <span className="text-3xl font-semibold tracking-tight tabular-nums">
        3,912
      </span>
      <span className="text-muted-foreground mt-10 text-xs">
        Across 14 presses this month
      </span>
    </div>
  );
}
