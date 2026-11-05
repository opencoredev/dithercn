import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the galaxy main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

// Only used with colorField, which paints the core in its own colour.
export const core = color({
  default: "orange",
  id: "core",
  label: "Core colour",
  options: DITHER_COLOR_NAMES,
});

export const colorField = toggle({
  default: false,
  id: "colorField",
  label: "Colour by place",
});

export const arms = slider({
  default: 2,
  id: "arms",
  label: "Arms",
  max: 5,
  min: 2,
  step: 1,
});

export const twist = slider({
  default: 1,
  id: "twist",
  label: "Twist",
  max: 2,
  min: 0.3,
  step: 0.1,
});

export const tilt = slider({
  default: 55,
  id: "tilt",
  label: "Tilt",
  max: 80,
  min: 0,
  step: 1,
  unit: "°",
});

export const angle = slider({
  default: 70,
  id: "angle",
  label: "Angle",
  max: 180,
  min: 0,
  step: 1,
  unit: "°",
});

export const direction = segmented({
  default: "clockwise",
  id: "direction",
  label: "Turns",
  options: ["clockwise", "counterclockwise"],
});

export const dust = slider({
  default: 0.8,
  id: "dust",
  label: "Dust",
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
  core,
  colorField,
  arms,
  twist,
  tilt,
  angle,
  direction,
  dust,
  stars,
  animate,
];
