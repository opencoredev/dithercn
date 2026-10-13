import { Halftone } from "@/components/dithercn/halftone";

export default function HalftoneSpotlight() {
  return (
    <section className="relative isolate flex size-full flex-col items-center gap-3 px-6 pt-10 text-center sm:pt-14">
      <Halftone
        source="radial"
        center={[0.5, 1.2]}
        radius={0.62}
        color="orange"
        background="transparent"
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-md text-3xl font-medium tracking-[-0.03em] text-balance">
        Printed overnight, sold out by noon
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        Limited risograph prints, numbered and signed. The next run opens on
        Friday.
      </p>
    </section>
  );
}
