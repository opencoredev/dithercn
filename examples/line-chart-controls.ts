import { BLOOMS, DITHER_COLOR_NAMES, FILL_VARIANTS } from "@/lib/dither";
import { color, segmented, toggle } from "@/lib/preview-controls";

// Knobs for the line chart's main demo, shared by the page and the demo.

export const fill = segmented({
  default: "gradient",
  id: "fill",
  label: "Band fill",
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

export const markers = segmented({
  default: "last",
  id: "markers",
  label: "Markers",
  options: ["all", "last", "none"],
});

export const curve = segmented({
  default: "smooth",
  id: "curve",
  label: "Curve",
  options: ["smooth", "linear"],
});

export const interactive = toggle({
  default: true,
  id: "interactive",
  label: "Interactive",
});

/** Display order of the tray. */
export const controls = [fill, tint, bloom, markers, curve, interactive];
