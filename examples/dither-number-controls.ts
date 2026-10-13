import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider } from "@/lib/preview-controls";

// Knobs for the dither number's main demo, shared by the page and the demo.

export const effect = segmented({
  default: "roll",
  id: "effect",
  label: "Effect",
  options: ["roll", "resolve"],
});

export const style = segmented({
  default: "integer",
  id: "format",
  label: "Format",
  options: ["integer", "currency", "percent", "compact"],
});

export const accent = color({
  default: "ink",
  id: "accent",
  label: "Accent",
  options: DITHER_COLOR_NAMES,
});

export const duration = slider({
  default: 900,
  id: "duration",
  label: "Duration",
  max: 1800,
  min: 200,
  step: 100,
  unit: "ms",
});

export const stagger = slider({
  default: 40,
  id: "stagger",
  label: "Stagger",
  max: 120,
  min: 0,
  step: 10,
  unit: "ms",
});

/** Display order of the tray. */
export const controls = [effect, style, accent, duration, stagger];
