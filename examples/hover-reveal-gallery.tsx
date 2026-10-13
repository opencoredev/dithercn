import { HoverReveal } from "@/components/dithercn/hover-reveal";

const MISSIONS = [
  {
    alt: "Earth rising over the Moon's horizon, from Apollo 8",
    src: "/examples/earthrise.jpg",
    title: "Apollo 8",
    year: "1968",
  },
  {
    alt: "Buzz Aldrin on the lunar surface during Apollo 11",
    src: "/examples/aldrin.jpg",
    title: "Apollo 11",
    year: "1969",
  },
  {
    alt: "The Pillars of Creation, photographed by the Hubble Space Telescope",
    src: "/examples/pillars.jpg",
    title: "Hubble",
    year: "2014",
  },
];

export default function HoverRevealGallery() {
  return (
    <ul className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
      {MISSIONS.map((mission) => (
        <li key={mission.src} className="flex flex-col gap-2.5">
          <HoverReveal
            src={mission.src}
            alt={mission.alt}
            reveal="dissolve"
            method="bayer4"
            className="aspect-4/5 w-full rounded-lg"
          />
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{mission.title}</span>
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              {mission.year}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
