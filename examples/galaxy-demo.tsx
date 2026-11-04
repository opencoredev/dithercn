"use client";

import { Galaxy } from "@/components/dithercn/galaxy";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/galaxy-controls";

export default function GalaxyDemo() {
  return (
    <Galaxy
      palette={[
        "--dither-paper",
        usePreviewValue(knobs.tint),
        usePreviewValue(knobs.core),
      ]}
      colorField={usePreviewValue(knobs.colorField)}
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
