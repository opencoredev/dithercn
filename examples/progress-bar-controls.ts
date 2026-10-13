import { BLOOMS, DITHER_COLOR_NAMES, FILL_VARIANTS } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the progress bar's main demo, shared by the page and the demo.

export const fill = segmented({
  default: "gradient",
  id: "fill",
  label: "Fill",
  options: FILL_VARIANTS,
});

export const tint = color({
  default: "blue",
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

export const size = segmented({
  default: "md",
  id: "size",
  label: "Size",
  options: ["sm", "md", "lg"],
});

export const segments = slider({
  default: 0,
  id: "segments",
  label: "Segments (0 is continuous)",
  max: 24,
  min: 0,
  step: 4,
});

export const indeterminate = toggle({
  default: false,
  id: "indeterminate",
  label: "Indeterminate",
});

/** Display order of the tray. */
export const controls = [fill, tint, bloom, size, segments, indeterminate];
