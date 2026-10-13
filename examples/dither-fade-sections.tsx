import { DitherFade } from "@/components/dithercn/dither-fade";

export default function DitherFadeSections() {
  return (
    <div className="flex size-full flex-col">
      <section className="bg-primary text-primary-foreground relative flex flex-1 flex-col items-center justify-center gap-2 px-6 pb-16 text-center">
        <h3 className="text-2xl font-medium tracking-[-0.03em] text-balance">
          Start free, upgrade when you ship
        </h3>
        <p className="max-w-sm text-sm text-pretty opacity-80">
          The blue section dissolves into the page below it.
        </p>
        <DitherFade size={96} cell={4} />
      </section>
      <section className="flex flex-1 items-center justify-center px-6">
        <p className="text-muted-foreground text-sm">Pricing table goes here</p>
      </section>
    </div>
  );
}
