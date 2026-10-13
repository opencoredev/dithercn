import { NoiseField } from "@/components/dithercn/noise-field";

export default function NoiseFieldMarble() {
  return (
    <section className="relative isolate flex size-full flex-col justify-end gap-2 p-8 sm:p-10">
      <NoiseField
        variant="marble"
        color="blue"
        highlight="--foreground"
        bands={5}
        warp={2.4}
        intensity={0.85}
        angle={20}
        mask="bottom"
        maskSize={0.55}
        className="absolute inset-0 -z-10"
      />
      <span className="text-muted-foreground font-mono text-xs tracking-[0.08em] uppercase">
        Changelog
      </span>
      <h3 className="max-w-sm text-3xl font-medium tracking-[-0.03em] text-balance">
        Faster builds, quieter logs
      </h3>
    </section>
  );
}
