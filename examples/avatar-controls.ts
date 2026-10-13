import { BLOOMS, DITHER_COLOR_NAMES, FILL_VARIANTS } from "@/lib/dither";
import {
  color,
  segmented,
  select,
  slider,
  toggle,
} from "@/lib/preview-controls";

// Knobs for the avatar's main demo, shared by the page and the demo.

export const name = select({
  default: "Ada Lovelace",
  id: "name",
  label: "Name",
  options: [
    "Ada Lovelace",
    "grace@navy.mil",
    "Linus",
    "deploy-bot",
    "Margaret Hamilton",
    "team-design",
  ],
});

export const fill = segmented({
  default: "gradient",
  id: "fill",
  label: "Fill",
  options: FILL_VARIANTS,
});

export const fromName = toggle({
  default: true,
  id: "from-name",
  label: "Colour from name",
});

export const tint = color({
  default: "blue",
  id: "color",
  label: "Colour",
  options: DITHER_COLOR_NAMES,
});

export const status = select({
  default: "online",
  id: "status",
  label: "Status",
  options: ["none", "online", "away", "busy", "offline"],
});

export const shape = segmented({
  default: "circle",
  id: "shape",
  label: "Shape",
  options: ["circle", "square"],
});

export const bloom = segmented({
  default: "off",
  id: "bloom",
  label: "Bloom",
  options: BLOOMS,
});

export const size = slider({
  default: 96,
  id: "size",
  label: "Size",
  max: 128,
  min: 24,
  step: 8,
  unit: "px",
});

export const ring = toggle({ default: false, id: "ring", label: "Ring" });

/** Display order of the tray. */
export const controls = [
  name,
  fill,
  fromName,
  tint,
  status,
  shape,
  size,
  bloom,
  ring,
];
