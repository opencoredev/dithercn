import { Galaxy } from "@/components/dithercn/galaxy";

export default function GalaxyEdgeOn() {
  return (
    <Galaxy
      tilt={76}
      angle={78}
      arms={3}
      twist={1.4}
      size={0.46}
      dust={1}
      stars={1.4}
      colorField
      palette={["--dither-paper", "blue", "purple", "orange"]}
      className="absolute inset-0"
    />
  );
}
