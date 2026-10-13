import { DITHER_COLOR_NAMES, DITHER_MATRICES } from "@/lib/dither";
import {
  color,
  segmented,
  select,
  slider,
  toggle,
} from "@/lib/preview-controls";

/** Knobs for the dither gradient's main demo, shared by the page and the demo. */
export const ditherGradientControls = {
  animate: toggle({ default: true, id: "animate", label: "Animate" }),
  cell: slider({
    default: 3,
    id: "cell",
    label: "Cell",
    max: 8,
    min: 1,
    step: 1,
    unit: "px",
  }),
  color: color({
    default: "ink",
    id: "color",
    label: "Ink",
    options: DITHER_COLOR_NAMES,
  }),
  matrix: select({
    default: "bayer4",
    id: "matrix",
    label: "Matrix",
    options: DITHER_MATRICES,
  }),
  mode: segmented({
    default: "linear",
    id: "mode",
    label: "Mode",
    options: ["linear", "radial", "conic"],
  }),
  noise: slider({
    default: 0.12,
    id: "noise",
    label: "Noise",
    max: 0.5,
    min: 0,
    step: 0.02,
  }),
  to: slider({
    default: 0.85,
    id: "to",
    label: "Strength",
    max: 1,
    min: 0.2,
    step: 0.05,
  }),
};
