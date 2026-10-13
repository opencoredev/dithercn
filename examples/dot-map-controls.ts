import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the dot map's main demo, shared by the page and the demo.

export const accent = color({
  default: "ink",
  id: "accent",
  label: "Accent",
  options: DITHER_COLOR_NAMES,
});

export const land = color({
  default: "grey",
  id: "color",
  label: "Land",
  options: DITHER_COLOR_NAMES,
});

export const shape = segmented({
  default: "square",
  id: "shape",
  label: "Dots",
  options: ["square", "round"],
});

export const columns = slider({
  default: 160,
  id: "columns",
  label: "Columns",
  max: 240,
  min: 80,
  step: 10,
});

export const halo = slider({
  default: 14,
  id: "halo",
  label: "Halo",
  max: 30,
  min: 0,
  step: 2,
  unit: "°",
});

export const arcs = toggle({ default: true, id: "arcs", label: "Arcs" });

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [accent, land, shape, columns, halo, arcs, animate];
