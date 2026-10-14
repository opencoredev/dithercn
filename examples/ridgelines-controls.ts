import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, slider, toggle } from "@/lib/preview-controls";

// Knobs for the ridgelines main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const lines = slider({
  default: 32,
  id: "lines",
  label: "Lines",
  max: 56,
  min: 12,
  step: 1,
});

export const amplitude = slider({
  default: 1,
  id: "amplitude",
  label: "Amplitude",
  max: 2,
  min: 0,
  step: 0.1,
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [tint, lines, amplitude, animate];
