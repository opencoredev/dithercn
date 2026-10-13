"use client";

import { Loader } from "@/components/dithercn/loader";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/loader-controls";

export default function LoaderDemo() {
  const variant = usePreviewValue(knobs.variant);
  const size = usePreviewValue(knobs.size);
  const color = usePreviewValue(knobs.tint);
  const bloom = usePreviewValue(knobs.bloom);
  const speed = usePreviewValue(knobs.speed);

  return (
    <div className="flex flex-col items-center gap-5">
      <Loader
        variant={variant}
        size={size}
        color={color}
        bloom={bloom}
        speed={speed}
      />
      <span className="text-muted-foreground font-mono text-xs">{variant}</span>
    </div>
  );
}
