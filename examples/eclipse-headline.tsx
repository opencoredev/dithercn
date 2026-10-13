import { Eclipse } from "@/components/dithercn/eclipse";

export default function EclipseHeadline() {
  return (
    <section className="relative isolate flex size-full flex-col justify-end p-8 sm:p-12">
      <Eclipse
        center={[0.78, 0.28]}
        size={0.3}
        corona={0.35}
        light={225}
        className="absolute inset-0 -z-10"
      />
      <div className="flex max-w-xs flex-col gap-3">
        <h3 className="text-3xl font-medium tracking-[-0.03em] text-balance">
          Totality, on 12 August
        </h3>
        <p className="text-muted-foreground text-sm text-pretty">
          The disc sits high on the right and is lit from the lower left, so the
          brightest edge of the rim faces the text below it.
        </p>
      </div>
    </section>
  );
}
