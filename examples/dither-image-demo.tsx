import { DitherImage } from "@/components/dithercn/dither-image";

export default function DitherImageDemo() {
  return (
    <DitherImage
      src="/examples/earthrise.jpg"
      alt="Earth rising over the Moon's horizon, photographed from Apollo 8 in 1968"
      ratio={4 / 3}
      className="w-full max-w-xl rounded-xl"
    />
  );
}
