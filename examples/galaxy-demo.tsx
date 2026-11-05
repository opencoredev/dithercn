"use client";

import { Galaxy } from "@/components/dithercn/galaxy";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/galaxy-controls";

export default function GalaxyDemo() {
  const tint = usePreviewValue(knobs.tint);
  const core = usePreviewValue(knobs.core);
  const colorField = usePreviewValue(knobs.colorField);
  return (
    <Galaxy
      // One ink by default, like the other backgrounds. Colour by place
      // adds the core's colour as a second ink.
      palette={
        colorField ? ["--dither-paper", tint, core] : ["--dither-paper", tint]
      }
      colorField={colorField}
      arms={usePreviewValue(knobs.arms)}
      twist={usePreviewValue(knobs.twist)}
      tilt={usePreviewValue(knobs.tilt)}
      angle={usePreviewValue(knobs.angle)}
      direction={usePreviewValue(knobs.direction)}
      dust={usePreviewValue(knobs.dust)}
      stars={usePreviewValue(knobs.stars)}
      animate={usePreviewValue(knobs.animate)}
      className="absolute inset-0"
    />
  );
}
