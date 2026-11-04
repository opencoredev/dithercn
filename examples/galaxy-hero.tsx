import { Galaxy } from "@/components/dithercn/galaxy";

export default function GalaxyHero() {
  return (
    <section className="relative isolate flex size-full flex-col justify-end p-8 sm:justify-center sm:p-12">
      <Galaxy
        center={[0.74, 0.38]}
        size={0.36}
        stars={0.4}
        tilt={48}
        angle={150}
        direction="counterclockwise"
        className="absolute inset-0 -z-10"
      />
      <div className="flex max-w-xs flex-col gap-3">
        <h3 className="text-3xl font-medium tracking-[-0.03em] text-balance">
          Every region, one console
        </h3>
        <p className="text-muted-foreground text-sm text-pretty">
          The galaxy sits high on the right with its long axis turned away from
          the copy, so the arms never run behind the text.
        </p>
      </div>
    </section>
  );
}
