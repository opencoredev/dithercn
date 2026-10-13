import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the aurora main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Edge colour",
  options: DITHER_COLOR_NAMES,
});

export const tip = color({
  default: "ink",
  id: "tip",
  label: "Tip colour",
  options: DITHER_COLOR_NAMES,
});

export const curtains = slider({
  default: 3,
  id: "curtains",
  label: "Curtains",
  max: 6,
  min: 1,
  step: 1,
});

export const height = slider({
  default: 0.42,
  id: "height",
  label: "Height",
  max: 0.8,
  min: 0.1,
  step: 0.02,
});

export const spread = slider({
  default: 0.11,
  id: "spread",
  label: "Spread",
  max: 0.3,
  min: 0,
  step: 0.01,
});

export const sway = slider({
  default: 1,
  id: "sway",
  label: "Sway",
  max: 3,
  min: 0,
  step: 0.25,
});

export const turbulence = slider({
  default: 0.6,
  id: "turbulence",
  label: "Turbulence",
  max: 2,
  min: 0,
  step: 0.1,
});

export const rays = slider({
  default: 8,
  id: "rays",
  label: "Rays",
  max: 20,
  min: 2,
  step: 1,
});

export const length = slider({
  default: 0.45,
  id: "length",
  label: "Ray length",
  max: 1,
  min: 0,
  step: 0.05,
});

export const glow = slider({
  default: 0.9,
  id: "glow",
  label: "Edge glow",
  max: 2,
  min: 0,
  step: 0.1,
});

export const tilt = slider({
  default: 0,
  id: "tilt",
  label: "Tilt",
  max: 30,
  min: -30,
  step: 1,
  unit: "°",
});

export const drift = slider({
  default: 0,
  id: "drift",
  label: "Drift",
  max: 2,
  min: -2,
  step: 0.25,
});

export const direction = segmented({
  default: "up",
  id: "direction",
  label: "Rays point",
  options: ["up", "down"],
});

export const mask = segmented({
  default: "none",
  id: "mask",
  label: "Mask",
  options: ["none", "top", "bottom", "edges"],
});

export const matrix = segmented({
  default: "bayer8",
  id: "matrix",
  label: "Matrix",
  options: ["bayer4", "bayer8", "blue-noise"],
});

export const cell = slider({
  default: 3,
  id: "cell",
  label: "Cell",
  max: 6,
  min: 1,
  step: 1,
  unit: "px",
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [
  tint,
  tip,
  curtains,
  height,
  spread,
  sway,
  turbulence,
  rays,
  length,
  glow,
  tilt,
  drift,
  direction,
  mask,
  matrix,
  cell,
  animate,
];
