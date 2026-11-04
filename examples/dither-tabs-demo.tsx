"use client";

import {
  DitherTabs,
  DitherTabsContent,
  DitherTabsList,
  DitherTabsTrigger,
} from "@/components/dithercn/dither-tabs";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/dither-tabs-controls";

const PANELS = [
  {
    body: "Production is on commit 4f2a9c1, built in 38 seconds and serving from 14 regions.",
    label: "Overview",
    stat: "99.98% uptime",
    value: "overview",
  },
  {
    body: "Three deploys today. The last preview went out 12 minutes ago from the fix/cache branch.",
    label: "Deploys",
    stat: "3 today",
    value: "deploys",
  },
  {
    body: "Builds run on Node 22 with a 2 GB cache. Previews expire after 30 days.",
    label: "Settings",
    stat: "Node 22",
    value: "settings",
  },
] as const;

export default function DitherTabsDemo() {
  const variant = usePreviewValue(knobs.variant);
  const color = usePreviewValue(knobs.tint);
  const matrix = usePreviewValue(knobs.matrix);
  const bloom = usePreviewValue(knobs.bloom);
  const cell = usePreviewValue(knobs.cell);

  return (
    <DitherTabs
      defaultValue="overview"
      variant={variant}
      color={color}
      matrix={matrix}
      bloom={bloom}
      cell={cell}
      className="w-full max-w-md items-center"
    >
      <DitherTabsList aria-label="Project">
        {PANELS.map((panel) => (
          <DitherTabsTrigger key={panel.value} value={panel.value}>
            {panel.label}
          </DitherTabsTrigger>
        ))}
      </DitherTabsList>
      {PANELS.map((panel) => (
        <DitherTabsContent
          key={panel.value}
          value={panel.value}
          className="flex w-full flex-col gap-1.5 text-center"
        >
          <span className="text-2xl font-semibold tracking-tight">
            {panel.stat}
          </span>
          <p className="text-muted-foreground mx-auto max-w-xs text-sm text-pretty">
            {panel.body}
          </p>
        </DitherTabsContent>
      ))}
    </DitherTabs>
  );
}
