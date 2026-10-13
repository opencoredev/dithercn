"use client";

import { DitheredLogo } from "@/components/dithercn/dithered-logo";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/dithered-logo-controls";

export default function DitheredLogoDemo() {
  const fill = usePreviewValue(knobs.fill);
  const effect = usePreviewValue(knobs.effect);
  const color = usePreviewValue(knobs.ink);
  const cell = usePreviewValue(knobs.cell);
  const outline = usePreviewValue(knobs.outline);

  return (
    <DitheredLogo
      src="/examples/logos/halcyra.svg"
      alt="Halcyra"
      ratio={163 / 40}
      fill={fill}
      effect={effect}
      color={color}
      cell={cell}
      outline={outline}
      className="h-16 max-w-full sm:h-24"
    />
  );
}
