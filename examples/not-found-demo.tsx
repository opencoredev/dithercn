"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

import { DitherButton } from "@/components/dithercn/dither-button";
import { NotFound } from "@/components/dithercn/not-found";
import { Icon } from "@/components/icon";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/not-found-controls";

export default function NotFoundDemo() {
  const code = usePreviewValue(knobs.code);
  const fill = usePreviewValue(knobs.fill);
  const color = usePreviewValue(knobs.tint);
  const bloom = usePreviewValue(knobs.bloom);
  const cell = usePreviewValue(knobs.cell);
  const depth = usePreviewValue(knobs.depth);

  return (
    <NotFound
      titleAs="h2"
      code={code}
      fill={fill}
      color={color}
      bloom={bloom}
      cell={cell}
      depth={depth}
      detail="GET /blog/2019/launch-week"
      actions={
        <>
          <DitherButton color={color}>
            <Icon icon={ArrowLeft01Icon} className="-ml-[5px]" />
            Back to home
          </DitherButton>
          <DitherButton variant="outline" color="grey">
            Search the docs
          </DitherButton>
        </>
      }
      className="w-full"
    />
  );
}
