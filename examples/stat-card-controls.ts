import { BLOOMS, DITHER_COLOR_NAMES, FILL_VARIANTS } from "@/lib/dither";
import { color, segmented } from "@/lib/preview-controls";

// Knobs for the stat card's main demo, shared by the page and the demo.

export const fill = segmented({
  default: "gradient",
  id: "fill",
  label: "Trend fill",
  options: FILL_VARIANTS,
});

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const bloom = segmented({
  default: "low",
  id: "bloom",
  label: "Bloom",
  options: BLOOMS,
});

export const good = segmented({
  default: "up",
  id: "good",
  label: "Good direction",
  options: ["up", "down"],
});

/** Display order of the tray. */
export const controls = [fill, tint, bloom, good];
