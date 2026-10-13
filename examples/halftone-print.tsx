import { Halftone } from "@/components/dithercn/halftone";

export default function HalftonePrint() {
  return (
    <section className="relative isolate flex size-full items-end overflow-hidden p-6 sm:p-10">
      <Halftone
        channels={["blue", "pink", "orange"]}
        size={16}
        angle={15}
        scale={0.7}
        className="absolute inset-0 -z-10"
      />
      <div className="bg-background/85 flex max-w-sm flex-col gap-2 rounded-xl p-5 backdrop-blur-sm">
        <span className="text-muted-foreground font-mono text-xs tracking-wide uppercase">
          Issue 07
        </span>
        <h3 className="text-2xl font-medium tracking-[-0.03em] text-balance">
          Three inks, one press, no plates to clean
        </h3>
        <p className="text-muted-foreground text-sm text-pretty">
          Cyan, magenta and yellow screens at 15°, 45° and 75°. Where the dots
          cross, the colours mix.
        </p>
      </div>
    </section>
  );
}
