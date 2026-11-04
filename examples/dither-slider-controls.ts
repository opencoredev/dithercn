import { BLOOMS, DITHER_COLOR_NAMES, DITHER_MATRICES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the dither slider's main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const size = segmented({
  default: "md",
  id: "size",
  label: "Size",
  options: ["sm", "md", "lg"],
});

export const matrix = segmented({
  default: "bayer4",
  id: "matrix",
  label: "Matrix",
  options: DITHER_MATRICES,
});

export const bloom = segmented({
  default: "low",
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

export const ticks = toggle({
  default: true,
  id: "ticks",
  label: "Ticks",
});

export const disabled = toggle({
  default: false,
  id: "disabled",
  label: "Disabled",
});

/** Display order of the tray. */
export const controls = [tint, size, matrix, bloom, cell, ticks, disabled];
