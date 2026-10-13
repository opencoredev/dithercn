import { DITHER_COLOR_NAMES, FILL_VARIANTS } from "@/lib/dither";
import { color, segmented, slider } from "@/lib/preview-controls";

// Knobs for the skeleton's main demo, shared by the page and the demo.

export const animation = segmented({
  default: "sweep",
  id: "animation",
  label: "Animation",
  options: ["sweep", "pulse", "none"],
});

export const fill = segmented({
  default: "dotted",
  id: "fill",
  label: "Fill",
  options: FILL_VARIANTS,
});

export const tint = color({
  default: "grey",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const cell = slider({
  default: 2,
  id: "cell",
  label: "Cell",
  max: 4,
  min: 1,
  step: 1,
  unit: "px",
});

export const duration = slider({
  default: 2.2,
  id: "duration",
  label: "Sweep",
  max: 4,
  min: 1,
  step: 0.2,
  unit: "s",
});

/** Display order of the tray. */
export const controls = [animation, fill, tint, cell, duration];
