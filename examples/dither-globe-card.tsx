import { DitherGlobe } from "@/components/dithercn/dither-globe";
import { SAO_PAULO } from "@/examples/dot-map-data";

const MARKERS = [{ at: SAO_PAULO }];

export default function DitherGlobeCard() {
  return (
    <div className="bg-background relative flex w-full max-w-xs flex-col gap-1 overflow-hidden rounded-2xl border p-5">
      <span className="text-muted-foreground text-sm">Busiest region</span>
      <span className="text-2xl font-semibold tracking-tight">São Paulo</span>
      <span className="text-muted-foreground text-xs tabular-nums">
        18.2k requests per minute
      </span>
      <DitherGlobe
        markers={MARKERS}
        start={-46}
        tilt={-32}
        speed={0}
        cell={2}
        ocean={0.1}
        atmosphere={false}
        draggable={false}
        color="grey"
        accent="orange"
        className="mt-2 -mb-20 aspect-square w-full"
      />
    </div>
  );
}
