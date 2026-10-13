import { ScrollRevealImage } from "@/components/dithercn/scroll-reveal-image";

const SHOTS = [
  { alt: "Buzz Aldrin on the Moon", src: "/examples/aldrin.jpg" },
  { alt: "The Pillars of Creation", src: "/examples/pillars.jpg" },
] as const;

export default function ScrollRevealImageGallery() {
  return (
    <div className="grid w-full max-w-xl grid-cols-2 gap-3">
      {SHOTS.map((shot, index) => (
        <ScrollRevealImage
          key={shot.src}
          src={shot.src}
          alt={shot.alt}
          preset="gameboy"
          end="dither"
          coarsest={16}
          // The second image starts a little later, so the pair staggers.
          start={1 - index * 0.12}
          ratio={4 / 5}
          className="w-full rounded-lg"
        />
      ))}
    </div>
  );
}
