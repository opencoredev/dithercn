import { DitherGlow } from "@/components/dithercn/dither-glow";

export default function DitherGlowHero() {
  return (
    <section className="relative isolate flex size-full flex-col items-center gap-3 px-6 pt-14 text-center sm:pt-20">
      <DitherGlow
        position="bottom"
        radius={0.45}
        intensity={0.9}
        className="absolute inset-0 -z-10"
      />
      <p className="text-muted-foreground font-mono text-xs tracking-wide uppercase">
        Now in beta
      </p>
      <h3 className="max-w-md text-3xl font-medium tracking-[-0.03em] text-balance sm:text-4xl">
        Ship the changelog with the release
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        Light rises from below the fold and stops short of the copy.
      </p>
    </section>
  );
}
