import { DitherGradient } from "@/components/dithercn/dither-gradient";

export default function DitherGradientStatic() {
  return (
    <div className="bg-background relative isolate flex w-full max-w-xs [--dither-paper:var(--background)] flex-col gap-1 overflow-hidden rounded-2xl p-5">
      <DitherGradient
        angle={0}
        from={0}
        to={0.55}
        matrix="bayer8"
        cell={4}
        animate={false}
        className="absolute inset-x-0 bottom-0 -z-10 h-2/3"
      />
      <span className="text-muted-foreground text-sm">Weekly active</span>
      <span className="text-3xl font-semibold tracking-tight tabular-nums">
        12,480
      </span>
      <span className="text-muted-foreground mt-10 text-xs">
        Up 8% on last week
      </span>
    </div>
  );
}
