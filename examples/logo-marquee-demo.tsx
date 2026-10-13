import { LogoMarquee } from "@/components/dithercn/logo-marquee";
import type { MarqueeLogo } from "@/components/dithercn/logo-marquee";

const LOGOS: MarqueeLogo[] = [
  { alt: "Halcyra", ratio: 163 / 40, src: "/examples/logos/halcyra.svg" },
  { alt: "Quillwork", ratio: 196 / 40, src: "/examples/logos/quillwork.svg" },
  { alt: "Orbitline", ratio: 166 / 40, src: "/examples/logos/orbitline.svg" },
  { alt: "Ferrovane", ratio: 197 / 40, src: "/examples/logos/ferrovane.svg" },
  { alt: "Lumenade", ratio: 203 / 40, src: "/examples/logos/lumenade.svg" },
  { alt: "Northpine", ratio: 246 / 40, src: "/examples/logos/northpine.svg" },
  { alt: "Vantor", ratio: 152 / 40, src: "/examples/logos/vantor.svg" },
  { alt: "Cobaltic", ratio: 166 / 40, src: "/examples/logos/cobaltic.svg" },
];

export default function LogoMarqueeDemo() {
  return (
    <div className="flex w-full flex-col items-center gap-8">
      <p className="text-muted-foreground text-sm">
        Teams that ship with dithercn
      </p>
      <LogoMarquee logos={LOGOS} label="Customers" />
    </div>
  );
}
