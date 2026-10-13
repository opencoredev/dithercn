import { ScrambleText } from "@/components/dithercn/scramble-text";

export default function ScrambleTextDemo() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 text-center">
      <ScrambleText
        as="h2"
        duration={1400}
        className="text-4xl leading-none font-semibold tracking-[-0.04em] sm:text-6xl"
      >
        Decoding the signal
      </ScrambleText>
      <ScrambleText
        as="p"
        delay={700}
        duration={1600}
        characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase"
      >
        Frame 0412 · 30 fps · bayer 4×4
      </ScrambleText>
    </div>
  );
}
