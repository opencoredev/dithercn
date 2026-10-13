import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, slider, toggle } from "@/lib/preview-controls";

// Knobs for the aurora main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const height = slider({
  default: 0.42,
  id: "height",
  label: "Height",
  max: 0.8,
  min: 0.2,
  step: 0.02,
});

export const sway = slider({
  default: 1,
  id: "sway",
  label: "Sway",
  max: 3,
  min: 0,
  step: 0.25,
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [tint, height, sway, animate];
