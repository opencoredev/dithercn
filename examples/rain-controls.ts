import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, slider, toggle } from "@/lib/preview-controls";

// Knobs for the rain main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Lights",
  options: DITHER_COLOR_NAMES,
});

export const second = color({
  default: "orange",
  id: "second",
  label: "Second lights",
  options: DITHER_COLOR_NAMES,
});

export const drops = slider({
  default: 1,
  id: "drops",
  label: "Drops",
  max: 2,
  min: 0,
  step: 0.1,
});

export const glow = slider({
  default: 1,
  id: "glow",
  label: "Glow",
  max: 2,
  min: 0,
  step: 0.05,
});

export const scale = slider({
  default: 1,
  id: "scale",
  label: "Scale",
  max: 2.5,
  min: 0.5,
  step: 0.1,
});

export const fade = slider({
  default: 0,
  id: "fade",
  label: "Fade",
  max: 1,
  min: 0,
  step: 0.05,
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [tint, second, drops, glow, scale, fade, animate];
