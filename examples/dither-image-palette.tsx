import { DitherImage } from "@/components/dithercn/dither-image";

export default function DitherImagePalette() {
  return (
    <DitherImage
      src="/examples/pillars.jpg"
      alt="The Pillars of Creation in the Eagle Nebula, photographed by Hubble"
      method="blue-noise"
      palette={["--dither-paper", "--chart-5", "--chart-2", "--chart-3"]}
      contrast={1.35}
      ratio={4 / 5}
      className="h-[340px] rounded-xl sm:h-[400px]"
    />
  );
}
