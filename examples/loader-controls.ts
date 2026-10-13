import { BLOOMS, DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider } from "@/lib/preview-controls";

// Knobs for the loader's main demo, shared by the page and the demo.

export const variant = segmented({
  default: "ring",
  id: "variant",
  label: "Variant",
  options: ["ring", "dots", "pulse", "bar"],
});

export const size = segmented({
  default: "lg",
  id: "size",
  label: "Size",
  options: ["sm", "md", "lg"],
});

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const bloom = segmented({
  default: "low",
  id: "bloom",
  label: "Bloom",
  options: BLOOMS,
});

export const speed = slider({
  default: 1,
  id: "speed",
  label: "Speed",
  max: 2,
  min: 0.25,
  step: 0.25,
  unit: "x",
});

/** Display order of the tray. */
export const controls = [variant, size, tint, bloom, speed];
