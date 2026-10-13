import { DITHER_COLOR_NAMES, DITHER_MATRICES } from "@/lib/dither";
import {
  color,
  segmented,
  select,
  slider,
  toggle,
} from "@/lib/preview-controls";

// Knobs for the dither gradient's main demo, shared by the page and the demo.

export const mode = segmented({
  default: "linear",
  id: "mode",
  label: "Mode",
  options: ["linear", "radial", "conic"],
});

export const ink = color({
  default: "ink",
  id: "color",
  label: "Ink",
  options: DITHER_COLOR_NAMES,
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

export const strength = slider({
  default: 0.85,
  id: "to",
  label: "Strength",
  max: 1,
  min: 0.2,
  step: 0.05,
});

export const noise = slider({
  default: 0.12,
  id: "noise",
  label: "Noise",
  max: 0.5,
  min: 0,
  step: 0.02,
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [mode, ink, matrix, cell, strength, noise, animate];
