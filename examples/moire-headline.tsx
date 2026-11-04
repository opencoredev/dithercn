import { Moire } from "@/components/dithercn/moire";

export default function MoireHeadline() {
  return (
    <section className="relative isolate flex size-full flex-col items-center justify-center gap-3 px-6 text-center">
      <Moire
        bands={2}
        angle={115}
        mask="center"
        palette={[
          "--dither-paper",
          "color-mix(in oklch, var(--dither-ink) 18%, var(--dither-paper))",
          "color-mix(in oklch, var(--dither-ink) 55%, var(--dither-paper))",
        ]}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-sm text-3xl font-medium tracking-[-0.03em] text-balance">
        Two layers, one picture
      </h3>
      <p className="text-muted-foreground max-w-[18rem] text-sm text-pretty">
        Sync your design files and your code, and see where they drift apart
        before your users do.
      </p>
    </section>
  );
}
