import { segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the fire main demo, shared by the page and the demo.

export const colors = segmented({
  default: "campfire",
  id: "palette",
  label: "Palette",
  options: ["campfire", "ink", "gas"],
});

export const height = slider({
  default: 0.55,
  id: "height",
  label: "Height",
  max: 1,
  min: 0.1,
  step: 0.05,
});

export const scale = slider({
  default: 1,
  id: "scale",
  label: "Scale",
  max: 2.5,
  min: 0.4,
  step: 0.1,
});

export const spread = slider({
  default: 1,
  id: "spread",
  label: "Spread",
  max: 1,
  min: 0.1,
  step: 0.05,
});

export const wind = slider({
  default: 0.15,
  id: "wind",
  label: "Wind",
  max: 1,
  min: -1,
  step: 0.05,
});

export const embers = slider({
  default: 1,
  id: "embers",
  label: "Embers",
  max: 3,
  min: 0,
  step: 0.1,
});

export const edge = segmented({
  default: "bottom",
  id: "edge",
  label: "Edge",
  options: ["bottom", "top"],
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [
  colors,
  height,
  scale,
  spread,
  wind,
  embers,
  edge,
  animate,
];
