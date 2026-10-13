import { DitherGradient } from "@/components/dithercn/dither-gradient";

export default function DitherGradientConic() {
  return (
    <DitherGradient
      mode="conic"
      angle={45}
      matrix="blue-noise"
      palette={[
        "--background",
        "--chart-1",
        "--chart-3",
        "--chart-1",
        "--background",
      ]}
      noise={0.15}
      className="absolute inset-0"
    />
  );
}
