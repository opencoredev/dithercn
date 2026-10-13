import { DitherMaker } from "@/components/dithercn/dither-maker";
import type { MakerPreset } from "@/components/dithercn/dither-maker";

// A brand kit page: the strip offers only the brand's own looks, and the
// downloads are named for the campaign.
const BRAND_LOOKS = [
  {
    id: "signal-blue",
    look: {
      brightness: 0,
      cell: 4,
      contrast: 10,
      invert: false,
      method: "bayer8",
      palette: ["#050b1f", "#3d6bff", "#dfe7ff"],
      tones: 3,
    },
    name: "Signal",
  },
  {
    id: "paper-print",
    look: {
      brightness: 10,
      cell: 3,
      contrast: 20,
      invert: false,
      method: "atkinson",
      palette: ["#1a1712", "#f3eee4"],
      tones: 2,
    },
    name: "Print",
  },
  {
    id: "night-grain",
    look: {
      brightness: -5,
      cell: 3,
      contrast: 25,
      invert: false,
      method: "blue-noise",
      palette: ["#000000", "purple", "#ffd9c2"],
      tones: 3,
    },
    name: "Grain",
  },
] as const satisfies readonly MakerPreset[];

export default function DitherMakerBrand() {
  return (
    <DitherMaker
      presets={BRAND_LOOKS}
      defaultPattern="noise"
      filename="launch-texture"
      className="max-w-3xl"
    />
  );
}
