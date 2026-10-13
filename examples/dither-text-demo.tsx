"use client";

import { DitherText } from "@/components/dithercn/dither-text";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/dither-text-controls";

export default function DitherTextDemo() {
  const fill = usePreviewValue(knobs.fill);
  const direction = usePreviewValue(knobs.direction);
  const color = usePreviewValue(knobs.tint);
  const bloom = usePreviewValue(knobs.bloom);
  const cell = usePreviewValue(knobs.cell);
  const speed = usePreviewValue(knobs.speed);
  const shared = {
    bloom,
    cell,
    color,
    direction,
    speed,
  };

  return (
    <DitherText
      as="h2"
      {...shared}
      {...(fill === "noise" ? { fill, scale: 2.6 } : { fill })}
      className="px-6 text-center text-6xl leading-[0.9] font-bold tracking-[-0.06em] sm:text-[5.5rem]"
    >
      Signal
      <br />
      through noise
    </DitherText>
  );
}
