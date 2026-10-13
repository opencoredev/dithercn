import { Waves } from "@/components/dithercn/waves";

export default function WavesDusk() {
  return (
    <Waves
      horizon={0.5}
      layers={8}
      amplitude={0.7}
      speed={0.6}
      matrix="bayer8"
      cell={4}
      palette={[
        "--dither-paper",
        "oklch(0.35 0.1 300)",
        "oklch(0.58 0.17 20)",
        "oklch(0.8 0.14 60)",
      ]}
      className="absolute inset-0"
    />
  );
}
