import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the caustics main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const scale = slider({
  default: 4,
  id: "scale",
  label: "Scale",
  max: 10,
  min: 2,
  step: 0.5,
});

export const focus = slider({
  default: 0.7,
  id: "focus",
  label: "Focus",
  max: 1,
  min: 0,
  step: 0.05,
});

export const angle = slider({
  default: 160,
  id: "angle",
  label: "Drift",
  max: 360,
  min: 0,
  step: 5,
  unit: "°",
});

export const mask = segmented({
  default: "none",
  id: "mask",
  label: "Mask",
  options: ["none", "center", "top", "bottom"],
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [tint, scale, focus, angle, mask, animate];
