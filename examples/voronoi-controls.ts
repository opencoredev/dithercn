import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the Voronoi main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const variant = segmented({
  default: "foam",
  id: "variant",
  label: "Variant",
  options: ["foam", "glaze", "stone"],
});

export const scale = slider({
  default: 1,
  id: "scale",
  label: "Scale",
  max: 3,
  min: 0.5,
  step: 0.1,
});

export const wall = slider({
  default: 1.5,
  id: "wall",
  label: "Wall",
  max: 5,
  min: 0.5,
  step: 0.5,
});

export const drift = slider({
  default: 1,
  id: "drift",
  label: "Drift",
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
export const controls = [tint, variant, scale, wall, drift, animate];
