import { DITHER_COLOR_NAMES, FILL_VARIANTS } from "@/lib/dither";
import { color, segmented, select, slider } from "@/lib/preview-controls";

// Knobs for the dither card's main demo, shared by the page and the demo.

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

export const glow = select({
  default: "top-right",
  id: "glow",
  label: "Glow",
  options: [
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
    "top",
    "bottom",
  ],
});

export const strength = slider({
  default: 0.6,
  id: "strength",
  label: "Strength",
  max: 1,
  min: 0.1,
  step: 0.05,
});

/** Display order of the tray. */
export const controls = [fill, tint, glow, strength];
