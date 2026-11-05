import { Moire } from "@/components/dithercn/moire";

export default function MoireRings() {
  return (
    <Moire
      variant="rings"
      bands={4}
      angle={70}
      colors={["blue", "purple", "pink", "orange"]}
      className="absolute inset-0"
    />
  );
}
