import { DitherText } from "@/components/dithercn/dither-text";

export default function DitherTextHatched() {
  return (
    <section className="flex w-full max-w-2xl flex-col items-center gap-5 px-6 text-center">
      <span className="text-muted-foreground font-mono text-xs tracking-[0.16em] uppercase">
        Launch week · Day 3
      </span>
      <h3 className="flex flex-col text-6xl leading-[0.88] font-black tracking-[-0.06em] sm:text-8xl">
        <DitherText fill="hatched" color="orange" bloom="low" cell={3}>
          Ship
        </DitherText>
        <DitherText fill="dotted" color="pink" direction="left" cell={3}>
          louder
        </DitherText>
      </h3>
      <p className="text-muted-foreground max-w-sm text-sm text-pretty">
        Hatched and dotted fills with a faint ghost between the lines, so the
        letters keep their shape at any cell size.
      </p>
    </section>
  );
}
