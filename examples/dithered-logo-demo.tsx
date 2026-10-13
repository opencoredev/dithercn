import { DitheredLogo } from "@/components/dithercn/dithered-logo";

export default function DitheredLogoDemo() {
  return (
    <DitheredLogo
      src="/examples/logos/halcyra.svg"
      alt="Halcyra"
      shimmer
      className="h-14 sm:h-20"
    />
  );
}
