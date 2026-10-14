import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, slider, toggle } from "@/lib/preview-controls";

// Knobs for the smoke main demo, shared by the page and the demo.

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
  max: 2.5,
  min: 0.4,
  step: 0.1,
});

export const wind = slider({
  default: 0.2,
  id: "wind",
  label: "Wind",
  max: 1,
  min: -1,
  step: 0.1,
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [tint, scale, wind, animate];
