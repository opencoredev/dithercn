import { Halftone } from "@/components/dithercn/halftone";

export default function HalftoneSpotlight() {
  return (
    <section className="relative isolate flex size-full flex-col items-center gap-3 px-6 pt-10 text-center sm:pt-14">
      <Halftone
        source="radial"
        center={[0.5, 1.2]}
        radius={0.62}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-md text-3xl font-medium tracking-[-0.03em] text-balance">
        Printed in four colours, sold out in one day
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        A radial source centred below the edge, so the dots swell from the
        bottom and leave the top clear.
      </p>
    </section>
  );
}
