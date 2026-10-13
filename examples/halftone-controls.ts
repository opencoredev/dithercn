import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the halftone's main demo, shared by the page and the demo.

export const source = segmented({
  default: "noise",
  id: "source",
  label: "Source",
  options: ["noise", "radial", "linear"],
});

export const inks = segmented({
  default: "one",
  id: "inks",
  label: "Inks",
  options: ["one", "two", "three"],
});

export const ink = color({
  default: "blue",
  id: "color",
  label: "Ink",
  options: DITHER_COLOR_NAMES,
});

export const size = slider({
  default: 10,
  id: "size",
  label: "Size",
  max: 24,
  min: 5,
  step: 1,
  unit: "px",
});

export const angle = slider({
  default: 45,
  id: "angle",
  label: "Angle",
  max: 90,
  min: 0,
  step: 5,
  unit: "°",
});

export const intensity = slider({
  default: 0.9,
  id: "intensity",
  label: "Intensity",
  max: 1,
  min: 0.3,
  step: 0.05,
});

export const drift = slider({
  default: 1,
  id: "drift",
  label: "Drift",
  max: 4,
  min: 0,
  step: 0.5,
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [
  source,
  inks,
  ink,
  size,
  angle,
  intensity,
  drift,
  animate,
];
