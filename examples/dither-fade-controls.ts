import { DITHER_MATRICES } from "@/lib/dither";
import { select, slider, toggle } from "@/lib/preview-controls";

// Knobs for the dither fade's main demo, shared by the page and the demo.

export const size = slider({
  default: 240,
  id: "size",
  label: "Size",
  max: 360,
  min: 80,
  step: 20,
  unit: "px",
});

export const matrix = select({
  default: "bayer4",
  id: "matrix",
  label: "Matrix",
  options: DITHER_MATRICES,
});

export const cell = slider({
  default: 3,
  id: "cell",
  label: "Cell",
  max: 8,
  min: 1,
  step: 1,
  unit: "px",
});

export const animate = toggle({
  default: false,
  id: "animate",
  label: "Drift",
});

/** Display order of the tray. */
export const controls = [size, matrix, cell, animate];
