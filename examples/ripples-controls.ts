import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, slider, toggle } from "@/lib/preview-controls";

// Knobs for the ripples main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const sources = slider({
  default: 2,
  id: "sources",
  label: "Sources",
  max: 4,
  min: 1,
  step: 1,
});

export const rings = slider({
  default: 12,
  id: "rings",
  label: "Rings",
  max: 30,
  min: 4,
  step: 1,
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [tint, sources, rings, animate];
