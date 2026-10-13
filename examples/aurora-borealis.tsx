import { Aurora } from "@/components/dithercn/aurora";

export default function AuroraBorealis() {
  return (
    <div className="absolute inset-0 bg-[oklch(0.14_0.03_250)] [--dither-paper:oklch(0.14_0.03_250)]">
      <Aurora
        height={0.3}
        sway={1.6}
        matrix="bayer8"
        palette={[
          "--dither-paper",
          "oklch(0.3 0.08 200)",
          "oklch(0.55 0.15 165)",
          "oklch(0.78 0.18 150)",
          "oklch(0.92 0.1 140)",
        ]}
        className="absolute inset-0"
      />
    </div>
  );
}
