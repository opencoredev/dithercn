import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, slider, toggle } from "@/lib/preview-controls";

// Knobs for the dither orb's main demo, shared by the page and the demo.

export const ink = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const size = slider({
  default: 0.26,
  id: "size",
  label: "Size",
  max: 0.48,
  min: 0.12,
  step: 0.02,
});

export const morph = slider({
  default: 1,
  id: "morph",
  label: "Morph",
  max: 2.5,
  min: 0,
  step: 0.25,
});

export const lean = slider({
  default: 1,
  id: "lean",
  label: "Lean",
  max: 2,
  min: 0,
  step: 0.25,
});

export const cell = slider({
  default: 3,
  id: "cell",
  label: "Cell",
  max: 6,
  min: 1,
  step: 1,
  unit: "px",
});

export const shine = toggle({
  default: true,
  id: "highlight",
  label: "Highlight",
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [ink, size, morph, lean, cell, shine, animate];
