import { Ripples } from "@/components/dithercn/ripples";

export default function RipplesDrop() {
  return (
    <section className="relative isolate flex size-full flex-col items-center justify-start gap-3 px-6 pt-14 text-center sm:pt-20">
      <Ripples
        sources={[[0.5, 1.02]]}
        rings={9}
        decay={1.4}
        intensity={0.85}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-md text-3xl font-medium tracking-[-0.03em] text-balance">
        Every change spreads
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        One source just below the frame sends rings up towards the text and
        fades before it reaches it.
      </p>
    </section>
  );
}
