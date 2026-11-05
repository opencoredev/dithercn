"use client";

import { BlackHole } from "@/components/dithercn/black-hole";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/black-hole-controls";

export default function BlackHoleDemo() {
  const tint = usePreviewValue(knobs.tint);

  return (
    <BlackHole
      // The gas runs from a pale tint at the cool rim through the full tint,
      // and the hottest gas and the photon ring are the tint mixed into the
      // page's foreground: warm white on a dark theme. On a light theme that
      // last colour is deep ink, which the hole keeps as its void, so the
      // gas still has two colours to shade through.
      palette={[
        "--dither-paper",
        toward(tint, 45),
        tint,
        toward(tint, 30, "--foreground"),
      ]}
      colorField={usePreviewValue(knobs.colorField)}
      tilt={usePreviewValue(knobs.tilt)}
      direction={usePreviewValue(knobs.direction)}
      size={usePreviewValue(knobs.size)}
      disk={usePreviewValue(knobs.disk)}
      stars={usePreviewValue(knobs.stars)}
      animate={usePreviewValue(knobs.animate)}
      className="absolute inset-0"
    />
  );
}
