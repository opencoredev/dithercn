import { Rain } from "@/components/dithercn/rain";

export default function RainCity() {
  return (
    <Rain
      drops={1.1}
      glow={1.35}
      scale={1.15}
      palette={["--dither-paper", "red", "orange"]}
      className="absolute inset-0"
    />
  );
}
