import { BLOOMS, DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the heatmap's main demo, shared by the page and the demo.

export const tint = color({
  default: "green",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const steps = slider({
  default: 4,
  id: "steps",
  label: "Steps",
  max: 6,
  min: 2,
  step: 1,
});

export const bloom = segmented({
  default: "low",
  id: "bloom",
  label: "Bloom",
  options: BLOOMS,
});

export const cell = slider({
  default: 3,
  id: "cell",
  label: "Largest cell",
  max: 4,
  min: 2,
  step: 1,
  unit: "px",
});

export const weekStart = segmented({
  default: "Sun",
  id: "weekStart",
  label: "Week starts",
  options: ["Sun", "Mon"],
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Ripple in",
});

/** Display order of the tray. */
export const controls = [tint, steps, bloom, cell, weekStart, animate];
