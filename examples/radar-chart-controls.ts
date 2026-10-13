import { BLOOMS, DITHER_COLOR_NAMES, FILL_VARIANTS } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the radar chart's main demo, shared by the page and the demo.

export const fill = segmented({
  default: "gradient",
  id: "fill",
  label: "Fill",
  options: FILL_VARIANTS,
});

export const bloom = segmented({
  default: "low",
  id: "bloom",
  label: "Bloom",
  options: BLOOMS,
});

export const grid = segmented({
  default: "polygon",
  id: "grid",
  label: "Grid",
  options: ["polygon", "circle"],
});

export const firstColor = color({
  default: "blue",
  id: "color",
  label: "First series",
  options: DITHER_COLOR_NAMES,
});

export const rings = slider({
  default: 4,
  id: "rings",
  label: "Rings",
  max: 6,
  min: 2,
  step: 1,
});

export const interactive = toggle({
  default: true,
  id: "interactive",
  label: "Interactive",
});

/** Display order of the tray. */
export const controls = [fill, bloom, grid, firstColor, rings, interactive];
