import { Beams } from "@/components/dithercn/beams";

export default function BeamsHeadline() {
  return (
    <section className="relative isolate flex size-full flex-col items-center justify-end gap-3 px-6 pb-14 text-center sm:pb-20">
      <Beams
        origin={[0.5, -0.05]}
        angle={180}
        spread={50}
        rays={7}
        reach={0.8}
        palette={["--dither-paper", "--chart-5", "--chart-1", "--chart-3"]}
        className="absolute inset-0 -z-10"
      />
      <h3 className="max-w-md text-3xl font-medium tracking-[-0.03em] text-balance">
        Now on stage
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        A spotlight from just above the frame, fading out before it reaches the
        text.
      </p>
    </section>
  );
}
