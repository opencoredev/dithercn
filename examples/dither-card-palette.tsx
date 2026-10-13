import { DitherCard } from "@/components/dithercn/dither-card";

export default function DitherCardPalette() {
  return (
    <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
      <DitherCard
        glow="bottom-right"
        color="green"
        matrix="blue-noise"
        strength={0.6}
        reach={240}
        cell={2}
        className="bg-background min-h-56 px-6"
      >
        <span className="font-semibold tracking-tight">
          Green, blue noise, 2px cells
        </span>
        <span className="text-muted-foreground -mt-4 text-sm">
          A finer grain for denser layouts.
        </span>
      </DitherCard>
      <DitherCard
        glow="bottom"
        color="orange"
        fill="hatched"
        reach={170}
        className="bg-background min-h-56 px-6"
      >
        <span className="font-semibold tracking-tight">Orange, hatched</span>
        <span className="text-muted-foreground -mt-4 text-sm">
          Diagonal lines that build up towards the edge.
        </span>
      </DitherCard>
    </div>
  );
}
