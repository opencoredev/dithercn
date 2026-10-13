import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the noise field main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const peak = color({
  default: "ink",
  id: "peak",
  label: "Peak colour",
  options: DITHER_COLOR_NAMES,
});

export const variant = segmented({
  default: "smoke",
  id: "variant",
  label: "Style",
  options: ["smoke", "ridges", "contours", "marble"],
});

export const scale = slider({
  default: 1.3,
  id: "scale",
  label: "Scale",
  max: 6,
  min: 0.5,
  step: 0.1,
});

export const warp = slider({
  default: 1.7,
  id: "warp",
  label: "Warp",
  max: 4,
  min: 0,
  step: 0.1,
});

export const detail = slider({
  default: 4,
  id: "detail",
  label: "Detail",
  max: 6,
  min: 1,
  step: 1,
});

export const contrast = slider({
  default: 1.2,
  id: "contrast",
  label: "Contrast",
  max: 3,
  min: 0.4,
  step: 0.1,
});

export const coverage = slider({
  default: 0,
  id: "coverage",
  label: "Coverage",
  max: 0.4,
  min: -0.4,
  step: 0.02,
});

export const intensity = slider({
  default: 0.9,
  id: "intensity",
  label: "Intensity",
  max: 1,
  min: 0.1,
  step: 0.05,
});

export const bands = slider({
  default: 8,
  id: "bands",
  label: "Bands",
  max: 24,
  min: 2,
  step: 1,
});

export const angle = slider({
  default: 90,
  id: "angle",
  label: "Flow angle",
  max: 360,
  min: 0,
  step: 15,
  unit: "°",
});

export const flow = slider({
  default: 1,
  id: "flow",
  label: "Flow speed",
  max: 4,
  min: 0,
  step: 0.25,
});

export const mask = segmented({
  default: "none",
  id: "mask",
  label: "Mask",
  options: ["none", "top", "bottom", "center", "edges"],
});

export const maskSize = slider({
  default: 0.5,
  id: "maskSize",
  label: "Mask size",
  max: 1,
  min: 0,
  step: 0.05,
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

export const invert = toggle({
  default: false,
  id: "invert",
  label: "Invert",
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [
  tint,
  peak,
  variant,
  scale,
  warp,
  detail,
  contrast,
  coverage,
  intensity,
  bands,
  angle,
  flow,
  mask,
  maskSize,
  matrix,
  cell,
  invert,
  animate,
];
