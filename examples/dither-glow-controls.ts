import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, select, slider, toggle } from "@/lib/preview-controls";

// Knobs for the dither glow main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const position = select({
  default: "top",
  id: "position",
  label: "Position",
  options: ["top", "bottom", "left", "right", "center"],
});

export const intensity = slider({
  default: 0.75,
  id: "intensity",
  label: "Intensity",
  max: 1,
  min: 0.2,
  step: 0.05,
});

export const radius = slider({
  default: 0.7,
  id: "radius",
  label: "Radius",
  max: 1.2,
  min: 0.3,
  step: 0.05,
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [tint, position, intensity, radius, animate];
