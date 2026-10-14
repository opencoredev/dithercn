import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the tunnel main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const shape = segmented({
  default: "circle",
  id: "shape",
  label: "Shape",
  options: ["circle", "square"],
});

export const rings = slider({
  default: 1,
  id: "rings",
  label: "Rings",
  max: 2,
  min: 0.5,
  step: 0.1,
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [tint, shape, rings, animate];
