import type { DitherImagePreset } from "@/components/dithercn/dither-image";
import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider } from "@/lib/preview-controls";

// Spelled out here: the component module is a client module, and this
// file is also read by the server-rendered docs page.
const DITHER_IMAGE_PRESETS = [
  "ink",
  "duotone",
  "newsprint",
  "gameboy",
  "riso",
] as const satisfies readonly DitherImagePreset[];

// Knobs for the scroll reveal's main demo, shared by the page and the demo.

export const preset = segmented({
  default: "duotone",
  id: "preset",
  label: "Preset",
  options: DITHER_IMAGE_PRESETS,
});

export const ink = color({
  default: "blue",
  id: "color",
  label: "Ink",
  options: DITHER_COLOR_NAMES,
});

export const end = segmented({
  default: "photo",
  id: "end",
  label: "Ends on",
  options: ["photo", "dither"],
});

export const coarsest = slider({
  default: 24,
  id: "coarsest",
  label: "First blocks",
  max: 48,
  min: 6,
  step: 2,
  unit: "×",
});

/** Display order of the tray. */
export const controls = [preset, ink, end, coarsest];
