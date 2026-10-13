import { DitheredLogo } from "@/components/dithercn/dithered-logo";
import { LOGOS } from "@/examples/dithered-logo-data";

export default function DitheredLogoSet() {
  return (
    <div className="grid w-full grid-cols-2 place-items-center gap-x-8 gap-y-10 sm:grid-cols-4">
      {LOGOS.map((logo) => (
        <DitheredLogo
          key={logo.src}
          src={logo.src}
          alt={logo.alt}
          ratio={logo.ratio}
          fill="hatched"
          color="grey"
          className="h-7 max-w-full"
        />
      ))}
    </div>
  );
}
