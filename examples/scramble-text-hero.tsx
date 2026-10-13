import { ScrambleText } from "@/components/dithercn/scramble-text";

export default function ScrambleTextHero() {
  return (
    <section className="flex w-full max-w-2xl flex-col items-center gap-4 px-6 text-center">
      <h2 className="text-3xl leading-[1.08] font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
        <ScrambleText mode="blocks" color="green" duration={700} stagger={26}>
          Every frame accounted for.
        </ScrambleText>
      </h2>
      <p className="text-muted-foreground max-w-md text-sm text-pretty sm:text-base">
        <ScrambleText
          mode="blocks"
          color="grey"
          delay={500}
          duration={380}
          stagger={6}
        >
          Render logs stream in as they land, so you can see what shipped and
          when.
        </ScrambleText>
      </p>
    </section>
  );
}
