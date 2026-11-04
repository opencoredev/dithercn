import { Caustics } from "@/components/dithercn/caustics";

export default function CausticsPool() {
  return (
    <Caustics
      scale={5}
      focus={0.8}
      angle={120}
      palette={[
        "oklch(0.38 0.08 232)",
        "oklch(0.5 0.1 222)",
        "oklch(0.7 0.11 205)",
        "oklch(0.96 0.04 195)",
      ]}
      className="absolute inset-0"
    />
  );
}
