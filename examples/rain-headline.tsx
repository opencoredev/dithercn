import { Rain } from "@/components/dithercn/rain";

export default function RainHeadline() {
  return (
    <section className="relative isolate flex size-full flex-col items-center justify-center gap-3 px-6 text-center">
      <Rain
        fade={1}
        glow={0.8}
        palette={["--dither-paper", "blue", "purple"]}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-sm text-3xl font-medium tracking-[-0.03em] text-balance">
        Stay in, the forecast can wait
      </h3>
      <p className="text-muted-foreground max-w-[18rem] text-sm text-pretty">
        A reading app for long evenings. Pick up the chapter you left on the
        train.
      </p>
    </section>
  );
}
