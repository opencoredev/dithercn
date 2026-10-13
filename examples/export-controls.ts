import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider } from "@/lib/preview-controls";

// Knobs for the export panel's main demo, shared by the page and the demo.

export const tint = color({
  default: "blue",
  id: "tint",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const method = segmented({
  default: "bayer4",
  id: "method",
  label: "Method",
  options: ["bayer4", "bayer8", "blue-noise", "atkinson"],
});

export const cell = slider({
  default: 4,
  id: "cell",
  label: "Cell",
  max: 8,
  min: 2,
  step: 1,
  unit: "px",
});

/** Display order of the tray. */
export const controls = [tint, method, cell];
