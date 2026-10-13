"use client";

import { DotMap } from "@/components/dithercn/dot-map";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/dot-map-controls";
import { OFFICES, ROUTES } from "@/examples/dot-map-data";

export default function DotMapDemo() {
  const accent = usePreviewValue(knobs.accent);
  const color = usePreviewValue(knobs.land);
  const shape = usePreviewValue(knobs.shape);
  const columns = usePreviewValue(knobs.columns);
  const halo = usePreviewValue(knobs.halo);
  const arcs = usePreviewValue(knobs.arcs);
  const animate = usePreviewValue(knobs.animate);

  return (
    <div className="flex size-full items-center justify-center p-4 sm:p-8">
      <DotMap
        markers={OFFICES}
        arcs={arcs ? ROUTES : undefined}
        accent={accent}
        color={color}
        shape={shape}
        columns={columns}
        halo={halo}
        animate={animate}
        title="Our offices"
        className="max-w-3xl"
      />
    </div>
  );
}
