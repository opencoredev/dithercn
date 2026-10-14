import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, slider, toggle } from "@/lib/preview-controls";

// Knobs for the contours main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const lines = slider({
  default: 14,
  id: "lines",
  label: "Lines",
  max: 32,
  min: 4,
  step: 1,
});

export const relief = slider({
  default: 0.5,
  id: "relief",
  label: "Relief",
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
export const controls = [tint, lines, relief, animate];
