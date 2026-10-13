import type { DitherImagePreset } from "@/components/dithercn/dither-image";
import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Spelled out here: the component module is a client module, and this
// file is also read by the server-rendered docs page.
const DITHER_IMAGE_PRESETS = [
  "ink",
  "duotone",
  "newsprint",
  "gameboy",
  "riso",
] as const satisfies readonly DitherImagePreset[];

// Knobs for the image compare's main demo, shared by the page and the demo.

export const preset = segmented({
  default: "duotone",
  id: "preset",
  label: "Dithered side",
  options: DITHER_IMAGE_PRESETS,
});

export const ink = color({
  default: "blue",
  id: "color",
  label: "Ink",
  options: DITHER_COLOR_NAMES,
});

export const cell = slider({
  default: 2,
  id: "cell",
  label: "Cell",
  max: 6,
  min: 1,
  step: 1,
  unit: "px",
});

export const labels = toggle({ default: true, id: "labels", label: "Labels" });

/** Display order of the tray. */
export const controls = [preset, ink, cell, labels];
