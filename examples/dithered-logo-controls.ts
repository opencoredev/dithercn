import type { LogoEffect } from "@/components/dithercn/dithered-logo";
import { DITHER_COLOR_NAMES, FILL_VARIANTS } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Spelled out here: the component module is a client module, and this
// file is also read by the server-rendered docs page.
const LOGO_EFFECTS = [
  "none",
  "shimmer",
  "scan",
] as const satisfies readonly LogoEffect[];

// Knobs for the dithered logo's main demo, shared by the page and the demo.

export const fill = segmented({
  default: "gradient",
  id: "fill",
  label: "Fill",
  options: FILL_VARIANTS,
});

export const effect = segmented({
  default: "shimmer",
  id: "effect",
  label: "Effect",
  options: LOGO_EFFECTS,
});

export const ink = color({
  default: "ink",
  id: "color",
  label: "Ink",
  options: DITHER_COLOR_NAMES,
});

export const cell = slider({
  default: 2,
  id: "cell",
  label: "Cell",
  max: 4,
  min: 1,
  step: 1,
  unit: "px",
});

export const outline = toggle({
  default: true,
  id: "outline",
  label: "Outline",
});

/** Display order of the tray. */
export const controls = [fill, effect, ink, cell, outline];
