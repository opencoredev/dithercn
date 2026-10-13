import { LogoMarquee } from "@/components/dithercn/logo-marquee";
import { LOGOS } from "@/examples/dithered-logo-data";

export default function LogoMarqueeRows() {
  return (
    <div className="flex w-full flex-col gap-4">
      <LogoMarquee
        logos={LOGOS}
        label="Customers"
        speed={24}
        fade="dither"
        fill="solid"
      />
      <LogoMarquee
        logos={LOGOS.toReversed()}
        label="Partners"
        speed={24}
        direction="right"
        fade="dither"
        fill="hatched"
        color="grey"
      />
    </div>
  );
}
