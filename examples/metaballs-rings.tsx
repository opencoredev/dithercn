import { Metaballs } from "@/components/dithercn/metaballs";

export default function MetaballsRings() {
  return (
    <Metaballs
      variant="rings"
      count={4}
      cell={2}
      className="absolute inset-0"
    />
  );
}
