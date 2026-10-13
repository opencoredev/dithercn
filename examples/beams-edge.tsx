import { Beams } from "@/components/dithercn/beams";

export default function BeamsEdge() {
  return (
    <Beams
      origin={[0.3, -2.5]}
      angle={170}
      spread={40}
      rays={6}
      reach={0.55}
      className="absolute inset-0"
    />
  );
}
