"use client";

import { NoiseField } from "@/components/dithercn/noise-field";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/noise-field-controls";

export default function NoiseFieldDemo() {
  const tint = usePreviewValue(knobs.tint);
  const peak = usePreviewValue(knobs.peak);

  return (
    <NoiseField
      color={tint}
      // The same colour twice would flatten the peaks; leave it two-tone.
      highlight={peak === tint ? undefined : peak}
      variant={usePreviewValue(knobs.variant)}
      scale={usePreviewValue(knobs.scale)}
      warp={usePreviewValue(knobs.warp)}
      detail={usePreviewValue(knobs.detail)}
      contrast={usePreviewValue(knobs.contrast)}
      coverage={usePreviewValue(knobs.coverage)}
      intensity={usePreviewValue(knobs.intensity)}
      bands={usePreviewValue(knobs.bands)}
      angle={usePreviewValue(knobs.angle)}
      flow={usePreviewValue(knobs.flow)}
      mask={usePreviewValue(knobs.mask)}
      maskSize={usePreviewValue(knobs.maskSize)}
      matrix={usePreviewValue(knobs.matrix)}
      cell={usePreviewValue(knobs.cell)}
      invert={usePreviewValue(knobs.invert)}
      animate={usePreviewValue(knobs.animate)}
      className="absolute inset-0"
    />
  );
}
