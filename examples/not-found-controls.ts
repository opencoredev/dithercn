import { BLOOMS, DITHER_COLOR_NAMES, FILL_VARIANTS } from "@/lib/dither";
import { color, segmented, select, slider } from "@/lib/preview-controls";

// Knobs for the 404's main demo, shared by the page and the demo.

export const code = select({
  default: "404",
  id: "code",
  label: "Code",
  options: ["404", "410", "500", "503"],
});

export const fill = segmented({
  default: "gradient",
  id: "fill",
  label: "Fill",
  options: FILL_VARIANTS,
});

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const bloom = segmented({
  default: "low",
  id: "bloom",
  label: "Bloom",
  options: BLOOMS,
});

export const cell = slider({
  default: 4,
  id: "cell",
  label: "Cell",
  max: 6,
  min: 2,
  step: 1,
  unit: "px",
});

export const depth = slider({
  default: 4,
  id: "depth",
  label: "Depth",
  max: 8,
  min: 0,
  step: 1,
  unit: " cells",
});

/** Display order of the tray. */
export const controls = [code, fill, tint, bloom, cell, depth];
