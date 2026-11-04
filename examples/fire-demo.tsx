"use client";

import { Fire } from "@/components/dithercn/fire";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/fire-controls";
import type { DitherPalette } from "@/lib/dither";

// Paper, then the inks from the tips of the flames to the base.
const PALETTES = {
  campfire: [
    "--dither-paper",
    "red",
    "orange",
    "color-mix(in oklch, var(--dither-color-orange) 35%, oklch(0.95 0.11 95))",
  ],
  gas: [
    "--dither-paper",
    "purple",
    "blue",
    "color-mix(in oklch, var(--dither-color-blue) 40%, oklch(0.93 0.05 220))",
  ],
  ink: [
    "--dither-paper",
    "color-mix(in oklch, var(--dither-ink) 55%, var(--dither-paper))",
    "--dither-ink",
  ],
} as const satisfies Record<
  (typeof knobs.colors.options)[number],
  DitherPalette
>;

export default function FireDemo() {
  return (
    <Fire
      palette={PALETTES[usePreviewValue(knobs.colors)]}
      height={usePreviewValue(knobs.height)}
      scale={usePreviewValue(knobs.scale)}
      spread={usePreviewValue(knobs.spread)}
      wind={usePreviewValue(knobs.wind)}
      embers={usePreviewValue(knobs.embers)}
      edge={usePreviewValue(knobs.edge)}
      animate={usePreviewValue(knobs.animate)}
      className="absolute inset-0"
    />
  );
}
