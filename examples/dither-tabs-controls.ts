import { BLOOMS, DITHER_COLOR_NAMES, DITHER_MATRICES } from "@/lib/dither";
import { color, segmented, select, slider } from "@/lib/preview-controls";

// Knobs for the dither tabs' main demo, shared by the page and the demo.

export const variant = segmented({
  default: "pill",
  id: "variant",
  label: "Variant",
  options: ["pill", "underline"],
});

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const matrix = select({
  default: "bayer4",
  id: "matrix",
  label: "Matrix",
  options: DITHER_MATRICES,
});

export const bloom = segmented({
  default: "off",
  id: "bloom",
  label: "Bloom",
  options: BLOOMS,
});

export const cell = slider({
  default: 2,
  id: "cell",
  label: "Cell",
  max: 4,
  min: 1,
  step: 1,
  unit: "px",
});

/** Display order of the tray. */
export const controls = [variant, tint, matrix, bloom, cell];
