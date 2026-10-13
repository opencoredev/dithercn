import { DissolveText } from "@/components/dithercn/dissolve-text";

export default function DissolveTextHatched() {
  return (
    <section className="flex flex-col items-center gap-2 px-6 text-center">
      <DissolveText
        as="h3"
        direction="center"
        color="purple"
        fill="hatched"
        cell={3}
        duration={800}
        className="text-6xl leading-none font-black tracking-[-0.06em] sm:text-8xl"
      >
        Afterglow
      </DissolveText>
      <DissolveText
        direction="center"
        delay={500}
        className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase"
      >
        Live set · Friday 22:00
      </DissolveText>
    </section>
  );
}
