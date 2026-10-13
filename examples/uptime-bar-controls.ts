import { BLOOMS, DITHER_COLOR_NAMES, FILL_VARIANTS } from "@/lib/dither";
import { color, segmented, slider } from "@/lib/preview-controls";

// Knobs for the uptime bar's main demo, shared by the page and the demo.

export const fill = segmented({
  default: "gradient",
  id: "fill",
  label: "Up days",
  options: FILL_VARIANTS,
});

export const up = color({
  default: "green",
  id: "color",
  label: "Up colour",
  options: DITHER_COLOR_NAMES,
});

export const bloom = segmented({
  default: "low",
  id: "bloom",
  label: "Incident bloom",
  options: BLOOMS,
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

/** Display order of the tray. */
export const controls = [fill, up, bloom, cell];
