import { RetroGrid } from "@/components/dithercn/retro-grid";

export default function RetroGridSunset() {
  return (
    <RetroGrid
      horizon={0.46}
      sun={0.5}
      columns={14}
      cell={4}
      palette={[
        "oklch(0.18 0.05 300)",
        "oklch(0.4 0.17 330)",
        "oklch(0.64 0.2 10)",
        "oklch(0.86 0.15 75)",
      ]}
      className="absolute inset-0"
    />
  );
}
