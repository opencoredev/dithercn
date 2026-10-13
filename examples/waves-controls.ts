import { DITHER_COLOR_NAMES } from "@/lib/dither";
import { color, segmented, slider, toggle } from "@/lib/preview-controls";

// Knobs for the waves main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const variant = segmented({
  default: "ocean",
  id: "variant",
  label: "Variant",
  options: ["ocean", "lines"],
});

export const amplitude = slider({
  default: 1,
  id: "amplitude",
  label: "Amplitude",
  max: 2,
  min: 0,
  step: 0.1,
});

export const animate = toggle({
  default: true,
  id: "animate",
  label: "Animate",
});

/** Display order of the tray. */
export const controls = [tint, variant, amplitude, animate];
