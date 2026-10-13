import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, slider, toggle } from "@/lib/preview-controls";

// Knobs for the eclipse main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Rim",
  options: DITHER_COLOR_NAMES,
});

export const size = slider({
  default: 0.24,
  id: "size",
  label: "Size",
  max: 0.4,
  min: 0.1,
  step: 0.01,
});

export const corona = slider({
  default: 0.5,
  id: "corona",
  label: "Corona",
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
export const controls = [tint, size, corona, animate];
