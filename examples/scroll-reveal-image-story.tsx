import { ScrollRevealImage } from "@/components/dithercn/scroll-reveal-image";

export default function ScrollRevealImageStory() {
  return (
    <section className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-primary font-mono text-xs tracking-[0.14em] uppercase">
          Chapter 2
        </span>
        <h3 className="text-2xl font-medium tracking-tight text-balance">
          Seen from 380,000 kilometres away
        </h3>
      </div>
      <ScrollRevealImage
        src="/examples/earthrise.jpg"
        alt="Earth rising over the Moon's horizon, photographed from Apollo 8"
        color="blue"
        finish={0.4}
        ratio={16 / 9}
        className="w-full rounded-xl"
      />
    </section>
  );
}
