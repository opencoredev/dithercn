import { Galaxy } from "@/components/dithercn/galaxy";

export default function GalaxyEdgeOn() {
  return (
    <Galaxy
      tilt={76}
      angle={78}
      arms={3}
      twist={1.4}
      size={0.5}
      dust={1}
      stars={1.4}
      className="absolute inset-0"
    />
  );
}
