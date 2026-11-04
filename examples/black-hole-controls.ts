import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the black hole main demo, shared by the page and the demo.

export const tint = color({
  default: "orange",
  id: "color",
  label: "Disk",
  options: DITHER_COLOR_NAMES,
});

export const colorField = toggle({
  default: true,
  id: "colorField",
  label: "Colour by heat",
});

export const tilt = slider({
  default: 80,
  id: "tilt",
  label: "Tilt",
  max: 88,
  min: 0,
  step: 1,
  unit: "°",
});

export const direction = segmented({
  default: "clockwise",
  id: "direction",
  label: "Direction",
  options: ["clockwise", "counterclockwise"],
});

export const size = slider({
  default: 0.5,
  id: "size",
  label: "Size",
  max: 0.9,
  min: 0.2,
  step: 0.01,
});

export const disk = slider({
  default: 1,
  id: "disk",
  label: "Disk",
  max: 1.5,
  min: 0,
  step: 0.05,
});

export const stars = slider({
  default: 1,
  id: "stars",
  label: "Stars",
  max: 3,
  min: 0,
  step: 0.1,
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [
  tint,
  colorField,
  tilt,
  direction,
  size,
  disk,
  stars,
  animate,
];
