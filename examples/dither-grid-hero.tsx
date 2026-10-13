import { DitherGrid } from "@/components/dithercn/dither-grid";

export default function DitherGridHero() {
  return (
    <section className="relative isolate flex size-full flex-col items-center gap-3 px-6 pt-12 text-center sm:pt-16">
      <DitherGrid
        horizon={0.36}
        columns={14}
        glow={0.7}
        palette={["--dither-paper", "--chart-5", "--dither-ink"]}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-md text-3xl font-medium tracking-[-0.03em] text-balance">
        Build the next level
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        A low horizon leaves the top half as open sky for the headline.
      </p>
    </section>
  );
}
