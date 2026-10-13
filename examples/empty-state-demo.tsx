"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";

import { DitherButton } from "@/components/dithercn/dither-button";
import { EmptyState } from "@/components/dithercn/empty-state";
import { Icon } from "@/components/icon";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/empty-state-controls";

export default function EmptyStateDemo() {
  const illustration = usePreviewValue(knobs.illustration);
  const matrix = usePreviewValue(knobs.matrix);
  const color = usePreviewValue(knobs.tint);
  const animate = usePreviewValue(knobs.animate);

  return (
    <EmptyState
      illustration={illustration}
      matrix={matrix}
      color={color}
      animate={animate}
      title="No projects yet"
      description="Create a project to deploy your first site. It takes about a minute."
      action={
        <>
          <DitherButton color={color}>
            <Icon icon={Add01Icon} />
            New project
          </DitherButton>
          <DitherButton variant="outline" color="grey">
            Import from Git
          </DitherButton>
        </>
      }
    />
  );
}
