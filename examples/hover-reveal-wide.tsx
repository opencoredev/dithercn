import { HoverReveal } from "@/components/dithercn/hover-reveal";

export default function HoverRevealWide() {
  return (
    <HoverReveal
      src="/examples/pillars.jpg"
      alt="The Pillars of Creation, photographed by the Hubble Space Telescope"
      method="blue-noise"
      revealMatrix="blue-noise"
      palette={["--dither-paper", "--chart-4", "--chart-3"]}
      cell={4}
      radius={200}
      className="aspect-video w-full max-w-2xl rounded-xl"
    />
  );
}
