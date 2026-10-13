import { MeshGradient } from "@/components/dithercn/mesh-gradient";

export default function MeshGradientSunset() {
  return (
    <MeshGradient
      blobs={5}
      size={0.5}
      palette={[
        "--dither-paper",
        "oklch(0.42 0.16 300)",
        "oklch(0.55 0.2 350)",
        "oklch(0.66 0.19 25)",
        "oklch(0.76 0.15 55)",
        "oklch(0.88 0.11 85)",
      ]}
      matrix="blue-noise"
      className="absolute inset-0"
    />
  );
}
