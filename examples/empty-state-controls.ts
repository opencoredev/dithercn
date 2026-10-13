import { DITHER_COLOR_NAMES, FILL_VARIANTS } from "@/lib/dither";
import { color, segmented, toggle } from "@/lib/preview-controls";

// Knobs for the empty state's main demo, shared by the page and the demo.

export const scene = segmented({
  default: "rings",
  id: "scene",
  label: "Scene",
  options: ["rings", "grid", "none"],
});

export const fill = segmented({
  default: "gradient",
  id: "fill",
  label: "Fill",
  options: FILL_VARIANTS,
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
  label: "Ripple",
});

/** Display order of the tray. */
export const controls = [scene, fill, tint, animate];
