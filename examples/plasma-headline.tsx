import { Plasma } from "@/components/dithercn/plasma";

export default function PlasmaHeadline() {
  return (
    <section className="relative isolate flex size-full flex-col items-center justify-center gap-3 px-6 text-center">
      <Plasma
        intensity={0.5}
        scale={0.7}
        warp={0.8}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-md text-3xl font-medium tracking-[-0.03em] text-balance">
        Ship the weird idea
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        Capped at half intensity, the plasma never gets bright enough to fight
        the text.
      </p>
    </section>
  );
}
