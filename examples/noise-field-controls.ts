import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the noise field main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const mask = segmented({
  default: "none",
  id: "mask",
  label: "Mask",
  options: ["none", "top", "bottom", "center"],
});

export const scale = slider({
  default: 1.3,
  id: "scale",
  label: "Scale",
  max: 4,
  min: 0.5,
  step: 0.1,
});

export const contrast = slider({
  default: 1.2,
  id: "contrast",
  label: "Contrast",
  max: 2.5,
  min: 0.4,
  step: 0.1,
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [tint, mask, scale, contrast, animate];
