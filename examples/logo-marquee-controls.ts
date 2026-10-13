import type { LogoEffect } from "@/components/dithercn/dithered-logo";
import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider } from "@/lib/preview-controls";

// Spelled out here: the component module is a client module, and this
// file is also read by the server-rendered docs page.
const LOGO_EFFECTS = [
  "none",
  "shimmer",
  "scan",
] as const satisfies readonly LogoEffect[];

// Knobs for the logo marquee's main demo, shared by the page and the demo.

export const speed = slider({
  default: 32,
  id: "speed",
  label: "Speed",
  max: 120,
  min: 8,
  step: 4,
  unit: "px/s",
});

export const fade = segmented({
  default: "soft",
  id: "fade",
  label: "Edge fade",
  options: ["soft", "dither", "none"],
});

export const direction = segmented({
  default: "left",
  id: "direction",
  label: "Direction",
  options: ["left", "right"],
});

export const effect = segmented({
  default: "none",
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

/** Display order of the tray. */
export const controls = [speed, fade, direction, effect, ink];
