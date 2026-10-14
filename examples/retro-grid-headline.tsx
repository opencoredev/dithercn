import { RetroGrid } from "@/components/dithercn/retro-grid";

export default function RetroGridHeadline() {
  return (
    <section className="relative isolate flex size-full flex-col items-center justify-start gap-3 px-6 pt-14 text-center sm:pt-20">
      <RetroGrid
        horizon={0.5}
        sun={0}
        speed={0.5}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-md text-3xl font-medium tracking-[-0.03em] text-balance">
        Press start
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        With the sun off, the sky stays clear for a headline and the floor keeps
        rolling underneath.
      </p>
    </section>
  );
}
