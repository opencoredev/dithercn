import { BLOOMS, DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the dropzone's main demo, shared by the page and the demo.

export const state = segmented({
  default: "live",
  id: "state",
  label: "State",
  options: ["live", "active", "reject"],
});

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const matrix = segmented({
  default: "bayer4",
  id: "matrix",
  label: "Matrix",
  options: ["bayer4", "bayer8", "blue-noise"],
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

export const disabled = toggle({
  default: false,
  id: "disabled",
  label: "Disabled",
});

/** Display order of the tray. */
export const controls = [state, tint, matrix, bloom, cell, disabled];
