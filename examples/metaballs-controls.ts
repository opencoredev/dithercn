import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the metaballs main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const variant = segmented({
  default: "solid",
  id: "variant",
  label: "Variant",
  options: ["solid", "rings"],
});

export const count = slider({
  default: 5,
  id: "count",
  label: "Blobs",
  max: 8,
  min: 2,
  step: 1,
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [tint, variant, count, animate];
