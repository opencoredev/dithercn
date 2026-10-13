import { DitherGradient } from "@/components/dithercn/dither-gradient";

export default function DitherGradientRadial() {
  return (
    <section className="relative isolate flex size-full flex-col items-center gap-3 px-6 pt-14 text-center sm:pt-20">
      <DitherGradient
        mode="radial"
        center={[0.5, 1.15]}
        radius={0.5}
        from={1}
        to={0}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-md text-3xl font-medium tracking-[-0.03em] text-balance">
        Release notes that people read
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        A glow that rises from the bottom edge and leaves the headline on clean
        paper.
      </p>
    </section>
  );
}
