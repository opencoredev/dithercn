"use client";

import { BlackHole } from "@/components/dithercn/black-hole";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/black-hole-controls";

export default function BlackHoleDemo() {
  const tint = usePreviewValue(knobs.tint);

  return (
    <BlackHole
      // The tint thins out to the cool rim, and the hottest gas and the
      // photon ring are the tint mixed into the page's foreground: warm
      // white on a dark theme, deep ink on a light one.
      palette={["--dither-paper", tint, toward(tint, 30, "--foreground")]}
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
