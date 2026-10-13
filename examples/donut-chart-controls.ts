import { BLOOMS, DITHER_COLOR_NAMES, FILL_VARIANTS } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the donut chart's main demo, shared by the page and the demo.

export const mode = segmented({
  default: "donut",
  id: "mode",
  label: "Mode",
  options: ["donut", "pie"],
});

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

export const firstColor = color({
  default: "blue",
  id: "color",
  label: "First slice",
  options: DITHER_COLOR_NAMES,
});

export const gap = slider({
  default: 1,
  id: "gap",
  label: "Gap (cells)",
  max: 3,
  min: 0,
  step: 1,
  unit: "",
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Sweep in",
});

/** Display order of the tray. */
export const controls = [mode, fill, bloom, firstColor, gap, animate];
