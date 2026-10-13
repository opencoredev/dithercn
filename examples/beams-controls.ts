import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, slider, toggle } from "@/lib/preview-controls";

// Knobs for the beams main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const rays = slider({
  default: 9,
  id: "rays",
  label: "Rays",
  max: 20,
  min: 2,
  step: 1,
});

export const spread = slider({
  default: 80,
  id: "spread",
  label: "Spread",
  max: 160,
  min: 20,
  step: 5,
  unit: "°",
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [tint, rays, spread, animate];
