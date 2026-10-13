import { BLOOMS, DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, select, slider } from "@/lib/preview-controls";

// Knobs for the dither text's main demo, shared by the page and the demo.

export const fill = select({
  default: "gradient",
  id: "fill",
  label: "Fill",
  options: ["gradient", "noise", "dotted", "hatched", "solid"],
});

export const direction = segmented({
  default: "down",
  id: "direction",
  label: "Direction",
  options: ["down", "up", "right", "left"],
});

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const bloom = segmented({
  default: "off",
  id: "bloom",
  label: "Bloom",
  options: BLOOMS,
});

export const cell = slider({
  default: 3,
  id: "cell",
  label: "Cell",
  max: 6,
  min: 2,
  step: 1,
  unit: "px",
});

export const speed = slider({
  default: 1,
  id: "speed",
  label: "Speed",
  max: 3,
  min: 0,
  step: 0.5,
  unit: "×",
});

/** Display order of the tray. */
export const controls = [fill, direction, tint, bloom, cell, speed];
