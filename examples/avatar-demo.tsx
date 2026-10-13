"use client";

import { Avatar } from "@/components/dithercn/avatar";
import type { AvatarStatus } from "@/components/dithercn/avatar";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/avatar-controls";

const OTHERS = [
  "Alan Turing",
  "katherine.j",
  "Edsger",
  "ci-runner",
  "Barbara Liskov",
  "Ken T.",
  "radia@perlman.net",
  "Hopper",
] as const;

export default function AvatarDemo() {
  const name = usePreviewValue(knobs.name);
  const fill = usePreviewValue(knobs.fill);
  const fromName = usePreviewValue(knobs.fromName);
  const tint = usePreviewValue(knobs.tint);
  const status = usePreviewValue(knobs.status);
  const shape = usePreviewValue(knobs.shape);
  const size = usePreviewValue(knobs.size);
  const bloom = usePreviewValue(knobs.bloom);
  const ring = usePreviewValue(knobs.ring);
  const presence: AvatarStatus | undefined =
    status === "none" ? undefined : status;

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-3">
        <Avatar
          name={name}
          size={size}
          fill={fill}
          color={fromName ? undefined : tint}
          status={presence}
          shape={shape}
          bloom={bloom}
          ring={ring}
        />
        <span className="text-muted-foreground font-mono text-xs">{name}</span>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {OTHERS.map((other) => (
          <Avatar
            key={other}
            name={other}
            size={36}
            fill={fill}
            shape={shape}
            color={fromName ? undefined : tint}
          />
        ))}
      </div>
    </div>
  );
}
