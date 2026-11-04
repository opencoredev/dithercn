"use client";

import { BlackHole } from "@/components/dithercn/black-hole";
import { usePreviewValue } from "@/components/preview-controls";
import { toward } from "@/examples/background-tint";
import * as knobs from "@/examples/black-hole-controls";

export default function BlackHoleDemo() {
  const tint = usePreviewValue(knobs.tint);

  return (
    <BlackHole
      // From a dim, cool rim to a white-hot inner edge: the page's
      // foreground is the hottest colour in either theme.
      palette={["--dither-paper", toward(tint, 60), tint, "--foreground"]}
      colorField={usePreviewValue(knobs.colorField)}
      tilt={usePreviewValue(knobs.tilt)}
      direction={usePreviewValue(knobs.direction)}
      size={usePreviewValue(knobs.size)}
      disk={usePreviewValue(knobs.disk)}
      stars={usePreviewValue(knobs.stars)}
      animate={usePreviewValue(knobs.animate)}
      levels={19}
      className="absolute inset-0"
    />
  );
}
