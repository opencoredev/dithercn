"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

import type { PreviewAlign } from "@/components/component-preview-frame";
import { cn } from "@/lib/utils";

// Same stage treatments as the docs preview and the landing's example wall.
const ALIGN_CLASS = {
  center:
    "flex items-center-safe justify-center-safe p-6 *:max-w-full *:min-w-0",
  stretch: "grid *:min-h-0 *:min-w-0",
} as const satisfies Record<PreviewAlign, string>;

/**
 * One docs demo alone on a viewport-sized stage, for
 * `scripts/capture-catalog.ts` to screenshot into a catalog tile.
 */
export const CatalogCaptureStage = ({
  demo,
  align,
}: {
  /** Demo file name under `examples/`, without the extension. */
  demo: string;
  align: PreviewAlign;
}) => {
  const Demo = useMemo(
    () => dynamic(() => import(`@/examples/${demo}.tsx`), { ssr: false }),
    [demo]
  );

  return (
    <div
      data-catalog-capture
      className={cn(
        "bg-card text-card-foreground relative isolate h-dvh w-dvw overflow-clip [--dither-paper:var(--card)]",
        ALIGN_CLASS[align]
      )}
    >
      <Demo />
    </div>
  );
};
