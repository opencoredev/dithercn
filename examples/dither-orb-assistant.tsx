import { DitherOrb } from "@/components/dithercn/dither-orb";

export default function DitherOrbAssistant() {
  return (
    <section className="relative isolate flex size-full flex-col items-center justify-end gap-5 overflow-hidden px-6 pb-10 text-center">
      <DitherOrb
        color="purple"
        highlight="color-mix(in oklch, var(--dither-color-purple) 30%, #fff)"
        size={0.3}
        className="absolute inset-x-0 top-0 bottom-[45%] -z-10 sm:bottom-1/4"
      />
      <div className="flex max-w-sm flex-col items-center gap-2">
        <h3 className="text-2xl font-medium tracking-[-0.03em] text-balance">
          Ask anything about your workspace
        </h3>
        <p className="text-muted-foreground text-sm">
          Answers cite the docs and tickets they came from.
        </p>
      </div>
      <div className="bg-background flex w-full max-w-sm items-center gap-2 rounded-xl border px-3 py-2 text-left">
        <span className="text-muted-foreground flex-1 truncate text-sm">
          Why did the deploy on Friday fail?
        </span>
        <kbd className="bg-muted text-muted-foreground rounded-sm px-1.5 py-0.5 font-mono text-[10px]">
          ⏎
        </kbd>
      </div>
    </section>
  );
}
