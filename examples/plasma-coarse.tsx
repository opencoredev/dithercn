import { Plasma } from "@/components/dithercn/plasma";

export default function PlasmaCoarse() {
  return (
    <Plasma
      matrix="bayer2"
      cell={6}
      levels={4}
      bands={2}
      animate={false}
      className="absolute inset-0"
    />
  );
}
