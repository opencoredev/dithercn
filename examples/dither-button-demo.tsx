"use client";

import { ArrowRight01Icon, Settings01Icon } from "@hugeicons/core-free-icons";

import { DitherButton } from "@/components/dithercn/dither-button";
import { Icon } from "@/components/icon";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/dither-button-controls";

export default function DitherButtonDemo() {
  const fill = usePreviewValue(knobs.fill);
  const color = usePreviewValue(knobs.tint);
  const size = usePreviewValue(knobs.size);
  const bloom = usePreviewValue(knobs.bloom);
  const cell = usePreviewValue(knobs.cell);
  const loading = usePreviewValue(knobs.loading);
  const shared = { cell, color, fill, size };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <DitherButton {...shared} bloom={bloom} loading={loading}>
        {loading ? "Deploying" : "Deploy"}
        {loading ? null : <Icon icon={ArrowRight01Icon} />}
      </DitherButton>
      <DitherButton {...shared} variant="outline">
        View logs
      </DitherButton>
      <DitherButton
        {...shared}
        size="icon"
        variant="outline"
        aria-label="Settings"
      >
        <Icon icon={Settings01Icon} />
      </DitherButton>
    </div>
  );
}
