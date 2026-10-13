import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, slider, toggle } from "@/lib/preview-controls";

// Knobs for the starfield main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const density = slider({
  default: 1,
  id: "density",
  label: "Density",
  max: 2,
  min: 0.2,
  step: 0.1,
});

export const twinkle = slider({
  default: 0.6,
  id: "twinkle",
  label: "Twinkle",
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
export const controls = [tint, density, twinkle, animate];
