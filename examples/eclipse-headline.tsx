import { Eclipse } from "@/components/dithercn/eclipse";

export default function EclipseHeadline() {
  return (
    <section className="relative isolate flex size-full items-center px-8 sm:px-12">
      <Eclipse
        center={[0.86, 0.5]}
        size={0.34}
        corona={0.35}
        light={250}
        className="absolute inset-0 -z-10"
      />
      <div className="flex max-w-xs flex-col gap-3">
        <h3 className="text-3xl font-medium tracking-[-0.03em] text-balance">
          Totality, on 12 August
        </h3>
        <p className="text-muted-foreground text-sm text-pretty">
          A large disc pushed to the right edge, lit from the left, so the
          corona reaches towards the text without crossing it.
        </p>
      </div>
    </section>
  );
}
