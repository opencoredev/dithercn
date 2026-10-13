import { BLOOMS, DITHER_COLOR_NAMES, FILL_VARIANTS } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the area chart's main demo, shared by the page and the demo.

export const fill = segmented({
  default: "gradient",
  id: "fill",
  label: "Fill",
  options: FILL_VARIANTS,
});

export const stack = segmented({
  default: "none",
  id: "stack",
  label: "Stack",
  options: ["none", "stacked", "percent"],
});

export const bloom = segmented({
  default: "low",
  id: "bloom",
  label: "Bloom",
  options: BLOOMS,
});

export const firstColor = color({
  default: "ink",
  id: "color",
  label: "First series",
  options: DITHER_COLOR_NAMES,
});

export const cell = slider({
  default: 3,
  id: "cell",
  label: "Cell",
  max: 6,
  min: 2,
  step: 1,
  unit: "px",
});

export const interactive = toggle({
  default: true,
  id: "interactive",
  label: "Interactive",
});

/** Display order of the tray. */
export const controls = [fill, stack, bloom, firstColor, cell, interactive];
