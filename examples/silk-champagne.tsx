import { Silk } from "@/components/dithercn/silk";

export default function SilkChampagne() {
  return (
    <Silk
      angle={135}
      folds={8}
      sheen={0.9}
      palette={[
        "oklch(0.2 0.02 60)",
        "oklch(0.42 0.06 65)",
        "oklch(0.68 0.09 75)",
        "oklch(0.93 0.05 90)",
      ]}
      className="absolute inset-0"
    />
  );
}
