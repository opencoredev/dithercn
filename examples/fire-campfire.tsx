import { Fire } from "@/components/dithercn/fire";

export default function FireCampfire() {
  return (
    <Fire
      spread={0.5}
      height={0.85}
      scale={1.6}
      wind={0.1}
      embers={2.2}
      palette={[
        "--dither-paper",
        "red",
        "orange",
        "color-mix(in oklch, var(--dither-color-orange) 35%, oklch(0.95 0.11 95))",
      ]}
      className="absolute inset-0"
    />
  );
}
