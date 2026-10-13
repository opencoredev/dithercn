import { DitherCard } from "@/components/dithercn/dither-card";

export default function DitherCardPalette() {
  return (
    <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
      <DitherCard
        glow="bottom-right"
        color="--chart-3"
        matrix="blue-noise"
        strength={0.6}
        reach={240}
        cell={2}
        className="bg-background min-h-56 px-6"
      >
        <span className="font-semibold tracking-tight">
          Blue noise, 2px cells
        </span>
        <span className="text-muted-foreground -mt-4 text-sm">
          A finer grain for denser layouts.
        </span>
      </DitherCard>
      <DitherCard
        glow="bottom"
        color="--foreground"
        strength={0.3}
        reach={150}
        matrix="bayer8"
        className="bg-background min-h-56 px-6"
      >
        <span className="font-semibold tracking-tight">Neutral, Bayer 8×8</span>
        <span className="text-muted-foreground -mt-4 text-sm">
          A quiet light for cards that sit beside charts.
        </span>
      </DitherCard>
    </div>
  );
}
