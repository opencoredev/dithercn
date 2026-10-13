"use client";

import { Skeleton } from "@/components/dithercn/skeleton";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/skeleton-controls";

export default function SkeletonDemo() {
  const look = {
    animation: usePreviewValue(knobs.animation),
    cell: usePreviewValue(knobs.cell),
    color: usePreviewValue(knobs.tint),
    duration: usePreviewValue(knobs.duration),
    fill: usePreviewValue(knobs.fill),
  };

  return (
    <div
      aria-busy="true"
      className="bg-background ring-border flex w-full max-w-sm flex-col gap-5 rounded-xl p-5 ring-1"
    >
      <span className="sr-only">Loading post</span>
      <div className="flex items-center gap-3">
        <Skeleton {...look} shape="circle" size={40} />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton {...look} className="h-3 w-32" />
          <Skeleton {...look} className="h-3 w-20" delay={0.08} />
        </div>
      </div>
      <Skeleton {...look} className="h-40 w-full rounded-lg" delay={0.16} />
      <Skeleton {...look} shape="text" lines={3} delay={0.24} />
    </div>
  );
}
