import { Metaballs } from "@/components/dithercn/metaballs";

export default function MetaballsLamp() {
  return (
    <div className="border-border relative h-96 w-56 overflow-hidden rounded-[3rem] border [--dither-paper:var(--background)]">
      <Metaballs
        count={5}
        size={0.95}
        speed={1.2}
        palette={[
          "--dither-paper",
          "oklch(0.45 0.16 20)",
          "oklch(0.68 0.2 40)",
          "oklch(0.85 0.15 80)",
        ]}
        className="absolute inset-0"
      />
    </div>
  );
}
