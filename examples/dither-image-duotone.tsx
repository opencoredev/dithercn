import { DitherImage } from "@/components/dithercn/dither-image";
import type { DitherColorName } from "@/lib/dither";

const MISSIONS: readonly {
  name: string;
  year: string;
  src: string;
  alt: string;
  color: DitherColorName;
}[] = [
  {
    alt: "Earth rising over the Moon's horizon",
    color: "blue",
    name: "Apollo 8",
    src: "/examples/earthrise.jpg",
    year: "1968",
  },
  {
    alt: "Buzz Aldrin standing on the Moon",
    color: "orange",
    name: "Apollo 11",
    src: "/examples/aldrin.jpg",
    year: "1969",
  },
  {
    alt: "The Pillars of Creation in the Eagle Nebula",
    color: "pink",
    name: "Hubble",
    src: "/examples/pillars.jpg",
    year: "2014",
  },
];

export default function DitherImageDuotone() {
  return (
    <div className="grid w-full gap-4 sm:grid-cols-3">
      {MISSIONS.map((mission) => (
        <article
          key={mission.name}
          className="bg-background flex flex-col overflow-hidden rounded-xl border"
        >
          <DitherImage
            src={mission.src}
            alt={mission.alt}
            preset="duotone"
            color={mission.color}
            ratio={1}
            className="w-full [--dither-paper:var(--background)]"
          />
          <div className="flex items-baseline justify-between px-4 py-3">
            <span className="text-sm font-medium">{mission.name}</span>
            <span className="text-muted-foreground font-mono text-xs">
              {mission.year}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
