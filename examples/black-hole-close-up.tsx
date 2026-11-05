import { BlackHole } from "@/components/dithercn/black-hole";

export default function BlackHoleCloseUp() {
  return (
    <BlackHole
      size={0.8}
      tilt={84}
      angle={97}
      center={[0.5, 0.56]}
      stars={1.6}
      colorField
      palette={[
        "oklch(0.13 0.02 45)",
        "oklch(0.52 0.19 32)",
        "oklch(0.74 0.17 58)",
        "oklch(0.97 0.04 90)",
      ]}
      levels={19}
      matrix="bayer8"
      className="absolute inset-0"
    />
  );
}
