"use client";

import { Add01Icon, InboxIcon } from "@hugeicons/core-free-icons";

import { DitherButton } from "@/components/dithercn/dither-button";
import { EmptyState } from "@/components/dithercn/empty-state";
import { Icon } from "@/components/icon";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/empty-state-controls";

export default function EmptyStateDemo() {
  const scene = usePreviewValue(knobs.scene);
  const fill = usePreviewValue(knobs.fill);
  const color = usePreviewValue(knobs.tint);
  const animate = usePreviewValue(knobs.animate);

  return (
    <EmptyState
      scene={scene}
      fill={fill}
      color={color}
      animate={animate}
      icon={<Icon icon={InboxIcon} />}
      title="No messages yet"
      description="When someone replies to a thread you follow, it shows up here."
      action={
        <>
          <DitherButton color={color}>
            <Icon icon={Add01Icon} />
            New message
          </DitherButton>
          <DitherButton variant="outline" color="grey">
            Notification settings
          </DitherButton>
        </>
      }
    />
  );
}
