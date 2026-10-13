import { NoiseField } from "@/components/dithercn/noise-field";

export default function NoiseFieldContour() {
  return (
    <NoiseField
      scale={1.4}
      contrast={3}
      intensity={1}
      matrix="bayer4"
      levels={3}
      cell={4}
      speed={0.7}
      className="absolute inset-0"
    />
  );
}
