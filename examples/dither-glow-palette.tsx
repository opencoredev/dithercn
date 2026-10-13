import { DitherGlow } from "@/components/dithercn/dither-glow";

export default function DitherGlowPalette() {
  return (
    <DitherGlow
      position={[0.3, 0.35]}
      radius={0.55}
      intensity={1}
      palette={[
        "--dither-paper",
        "color-mix(in oklch, var(--dither-ink) 30%, var(--dither-paper))",
        "oklch(0.6 0.2 305)",
        "--dither-ink",
        "color-mix(in oklch, var(--dither-ink) 45%, var(--foreground))",
      ]}
      cell={4}
      className="absolute inset-0"
    />
  );
}
