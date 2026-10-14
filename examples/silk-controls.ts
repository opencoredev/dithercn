import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, slider, toggle } from "@/lib/preview-controls";

// Knobs for the silk main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const folds = slider({
  default: 6,
  id: "folds",
  label: "Folds",
  max: 10,
  min: 1,
  step: 0.5,
});

export const sheen = slider({
  default: 0.6,
  id: "sheen",
  label: "Sheen",
  max: 1,
  min: 0,
  step: 0.05,
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [tint, folds, sheen, animate];
