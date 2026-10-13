import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, select, slider } from "@/lib/preview-controls";

// Knobs for the dissolve text's main demo, shared by the page and the demo.

export const by = segmented({
  default: "char",
  id: "by",
  label: "By",
  options: ["char", "word", "line"],
});

export const direction = select({
  default: "start",
  id: "direction",
  label: "Order",
  options: ["start", "end", "center", "edges", "random"],
});

export const fill = segmented({
  default: "solid",
  id: "fill",
  label: "Settles into",
  options: ["solid", "gradient", "dotted", "hatched"],
});

export const accent = color({
  default: "ink",
  id: "accent",
  label: "Accent",
  options: DITHER_COLOR_NAMES,
});

export const cell = slider({
  default: 3,
  id: "cell",
  label: "Cell",
  max: 6,
  min: 1,
  step: 1,
  unit: "px",
});

export const speed = slider({
  default: 1,
  id: "speed",
  label: "Speed",
  max: 2,
  min: 0.25,
  step: 0.25,
  unit: "×",
});

/** Display order of the tray. */
export const controls = [by, direction, fill, accent, cell, speed];
