import type { DitherImagePreset } from "@/components/dithercn/dither-image";
import { DITHER_COLOR_NAMES, DITHER_METHODS } from "@/lib/dither";
import {
  color,
  segmented,
  select,
  slider,
  toggle,
} from "@/lib/preview-controls";

// Spelled out here: the component module is a client module, and this
// file is also read by the server-rendered docs page.
const DITHER_IMAGE_PRESETS = [
  "ink",
  "duotone",
  "newsprint",
  "gameboy",
  "riso",
] as const satisfies readonly DitherImagePreset[];

// Knobs for the dither image's main demo, shared by the page and the demo.

export const preset = segmented({
  default: "duotone",
  id: "preset",
  label: "Preset",
  options: DITHER_IMAGE_PRESETS,
});

export const ink = color({
  default: "blue",
  id: "color",
  label: "Ink (ink, duotone)",
  options: DITHER_COLOR_NAMES,
});

export const method = select({
  default: "preset",
  id: "method",
  label: "Method",
  options: ["preset", ...DITHER_METHODS],
});

export const sharpen = slider({
  default: 0.3,
  id: "sharpen",
  label: "Sharpen",
  max: 1,
  min: 0,
  step: 0.1,
});

export const invert = toggle({ default: false, id: "invert", label: "Invert" });

/** Display order of the tray. */
export const controls = [preset, ink, method, sharpen, invert];
