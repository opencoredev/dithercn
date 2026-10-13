import { BLOOMS, DITHER_COLOR_NAMES, FILL_VARIANTS } from "@/lib/dither";
import { color, segmented, slider } from "@/lib/preview-controls";

// Knobs for the gauge's main demo, shared by the page and the demo.

export const value = slider({
  default: 68,
  id: "value",
  label: "Load",
  max: 100,
  min: 0,
  step: 1,
  unit: "%",
});

export const variant = segmented({
  default: "half",
  id: "variant",
  label: "Variant",
  options: ["half", "dial", "ring"],
});

export const fill = segmented({
  default: "gradient",
  id: "fill",
  label: "Fill",
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

/** Display order of the tray. */
export const controls = [value, variant, fill, tint, bloom];
