import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, slider, toggle } from "@/lib/preview-controls";

// Knobs for the horizon main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Glow",
  options: DITHER_COLOR_NAMES,
});

export const aurora = slider({
  default: 1,
  id: "aurora",
  label: "Aurora",
  max: 1,
  min: 0,
  step: 0.05,
});

export const stars = slider({
  default: 1,
  id: "stars",
  label: "Stars",
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
export const controls = [tint, aurora, stars, animate];
