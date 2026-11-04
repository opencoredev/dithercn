import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the moiré main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const variant = segmented({
  default: "lines",
  id: "variant",
  label: "Variant",
  options: ["lines", "rings", "mesh"],
});

export const pitch = slider({
  default: 4,
  id: "pitch",
  label: "Pitch",
  max: 8,
  min: 3,
  step: 1,
});

export const bands = slider({
  default: 3,
  id: "bands",
  label: "Bands",
  max: 8,
  min: 1,
  step: 0.5,
});

export const angle = slider({
  default: 30,
  id: "angle",
  label: "Angle",
  max: 180,
  min: 0,
  step: 5,
  unit: "°",
});

export const drift = slider({
  default: 1,
  id: "drift",
  label: "Drift",
  max: 3,
  min: 0,
  step: 0.25,
});

export const warp = slider({
  default: 0.6,
  id: "warp",
  label: "Warp",
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
export const controls = [
  tint,
  variant,
  pitch,
  bands,
  angle,
  drift,
  warp,
  animate,
];
