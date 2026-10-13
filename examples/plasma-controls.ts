import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, slider, toggle } from "@/lib/preview-controls";

// Knobs for the plasma main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const scale = slider({
  default: 1,
  id: "scale",
  label: "Scale",
  max: 3,
  min: 0.3,
  step: 0.1,
});

export const warp = slider({
  default: 0.3,
  id: "warp",
  label: "Warp",
  max: 1.5,
  min: 0,
  step: 0.05,
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [tint, scale, warp, animate];
