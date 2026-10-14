import { Smoke } from "@/components/dithercn/smoke";

export default function SmokeEmbers() {
  return (
    <Smoke
      scale={1.4}
      height={1}
      wind={0.6}
      matrix="blue-noise"
      palette={[
        "--dither-paper",
        "oklch(0.32 0.08 30)",
        "oklch(0.58 0.19 35)",
        "oklch(0.82 0.15 70)",
      ]}
      className="absolute inset-0"
    />
  );
}
