import { Aurora } from "@/components/dithercn/aurora";

export default function AuroraHero() {
  return (
    <section className="relative isolate flex size-full flex-col items-center justify-end gap-3 px-6 pb-14 text-center">
      <Aurora
        height={0.55}
        intensity={0.85}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-md text-3xl font-medium tracking-[-0.03em] text-balance sm:text-4xl">
        Launch week, day three
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        The curtains hang above the headline and leave the lower third clear.
      </p>
    </section>
  );
}
