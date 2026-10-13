import { Plasma } from "@/components/dithercn/plasma";

export default function PlasmaPalette() {
  return (
    <Plasma
      palette={[
        "--background",
        "--chart-5",
        "--chart-4",
        "--chart-1",
        "--chart-3",
      ]}
      bands={1.6}
      matrix="blue-noise"
      className="absolute inset-0"
    />
  );
}
