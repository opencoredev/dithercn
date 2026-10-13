"use client";

import { ImageCompare } from "@/components/dithercn/image-compare";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/image-compare-controls";

export default function ImageCompareDemo() {
  const preset = usePreviewValue(knobs.preset);
  const color = usePreviewValue(knobs.ink);
  const cell = usePreviewValue(knobs.cell);
  const labels = usePreviewValue(knobs.labels);

  return (
    <ImageCompare
      src="/examples/tetons.jpg"
      alt="The Grand Teton range above the Snake River, dithered on the left and original on the right"
      before={{ cell, color, kind: "dither", preset }}
      labels={labels}
      ratio={5 / 4}
      className="w-full max-w-xl rounded-xl"
    />
  );
}
