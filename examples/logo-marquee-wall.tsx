import { LogoMarquee } from "@/components/dithercn/logo-marquee";
import { LOGOS } from "@/examples/dithered-logo-data";

// Each logo links to its case study, so the wall works from the keyboard.
const LINKED = LOGOS.map((logo) => ({ ...logo, href: "#customers" }));

export default function LogoMarqueeWall() {
  return (
    <LogoMarquee
      variant="wall"
      logos={LINKED}
      label="Customers"
      logoHeight={26}
      effect="shimmer"
      period={9}
    />
  );
}
