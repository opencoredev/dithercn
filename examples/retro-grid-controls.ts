import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, slider, toggle } from "@/lib/preview-controls";

// Knobs for the retro grid main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const horizon = slider({
  default: 0.42,
  id: "horizon",
  label: "Horizon",
  max: 0.8,
  min: 0.2,
  step: 0.02,
});

export const sun = slider({
  default: 0.4,
  id: "sun",
  label: "Sun",
  max: 0.6,
  min: 0,
  step: 0.02,
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [tint, horizon, sun, animate];
