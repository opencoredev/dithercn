import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, slider, toggle } from "@/lib/preview-controls";

// Knobs for the dither globe's main demo, shared by the page and the demo.

export const ink = color({
  default: "ink",
  id: "color",
  label: "Land",
  options: DITHER_COLOR_NAMES,
});

export const accent = color({
  default: "orange",
  id: "accent",
  label: "Accent",
  options: DITHER_COLOR_NAMES,
});

export const speed = slider({
  default: 6,
  id: "speed",
  label: "Speed",
  max: 30,
  min: -30,
  step: 2,
  unit: "°/s",
});

export const tilt = slider({
  default: 18,
  id: "tilt",
  label: "Tilt",
  max: 40,
  min: -40,
  step: 2,
  unit: "°",
});

export const cell = slider({
  default: 2,
  id: "cell",
  label: "Cell",
  max: 5,
  min: 1,
  step: 1,
  unit: "px",
});

export const arcs = toggle({ default: true, id: "arcs", label: "Arcs" });

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [ink, accent, speed, tilt, cell, arcs, animate];
