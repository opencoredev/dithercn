import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider } from "@/lib/preview-controls";

// Knobs for the scramble text's main demo, shared by the page and the demo.

export const mode = segmented({
  default: "dither",
  id: "mode",
  label: "Mode",
  options: ["dither", "blocks", "glyphs"],
});

export const caret = segmented({
  default: "always",
  id: "caret",
  label: "Caret",
  options: ["none", "running", "always"],
});

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const speed = slider({
  default: 1,
  id: "speed",
  label: "Speed",
  max: 2,
  min: 0.25,
  step: 0.25,
  unit: "×",
});

export const stagger = slider({
  default: 34,
  id: "stagger",
  label: "Stagger",
  max: 90,
  min: 0,
  step: 2,
  unit: "ms",
});

/** Display order of the tray. */
export const controls = [mode, caret, tint, speed, stagger];
