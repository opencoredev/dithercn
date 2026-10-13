import { BLOOMS, DITHER_COLOR_NAMES, FILL_VARIANTS } from "@/lib/dither";
import { color, segmented, toggle } from "@/lib/preview-controls";

// Knobs for the sparkline's main demo, shared by the page and the demo.

export const tint = color({
  default: "ink",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const fill = segmented({
  default: "gradient",
  id: "fill",
  label: "Fill",
  options: FILL_VARIANTS,
});

export const bloom = segmented({
  default: "low",
  id: "bloom",
  label: "Bloom",
  options: BLOOMS,
});

export const area = toggle({ default: true, id: "area", label: "Area" });

export const dot = toggle({ default: true, id: "dot", label: "Latest dot" });

export const interactive = toggle({
  default: false,
  id: "interactive",
  label: "Interactive",
});

/** Display order of the tray. */
export const controls = [tint, fill, bloom, area, dot, interactive];
