import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the flow field main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const variant = segmented({
  default: "streaks",
  id: "variant",
  label: "Style",
  options: ["streaks", "lines"],
});

export const density = slider({
  default: 1,
  id: "density",
  label: "Density",
  max: 2,
  min: 0.5,
  step: 0.1,
});

export const trail = slider({
  default: 0.55,
  id: "trail",
  label: "Trail",
  max: 1,
  min: 0.1,
  step: 0.05,
});

export const turbulence = slider({
  default: 1,
  id: "turbulence",
  label: "Turbulence",
  max: 2,
  min: 0,
  step: 0.1,
});

export const angle = slider({
  default: 20,
  id: "angle",
  label: "Wind angle",
  max: 360,
  min: 0,
  step: 15,
  unit: "°",
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
  density,
  trail,
  turbulence,
  angle,
  animate,
];
