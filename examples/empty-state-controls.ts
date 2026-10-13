import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, toggle } from "@/lib/preview-controls";

// Knobs for the empty state's main demo, shared by the page and the demo.

export const illustration = segmented({
  default: "box",
  id: "illustration",
  label: "Illustration",
  options: ["box", "search", "folder", "planet"],
});

export const matrix = segmented({
  default: "bayer4",
  id: "matrix",
  label: "Matrix",
  options: ["bayer4", "bayer8", "blue-noise"],
});

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [illustration, matrix, tint, animate];
