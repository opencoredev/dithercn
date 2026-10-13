import type { ReactNode } from "react";

import { ComponentPreviewFrame } from "@/components/component-preview-frame";
import type {
  PreviewAlign,
  PreviewSize,
} from "@/components/component-preview-frame";
import { formatCode } from "@/lib/format-code";
import { highlightCode } from "@/lib/highlight-code";
import type { PreviewControlSet } from "@/lib/preview-controls";
import { readOptionalFromRoot } from "@/lib/registry";

/**
 * A demo on a framed stage with Preview and Code tabs.
 *
 * ```mdx
 * <ComponentPreview src="examples/aurora-demo.tsx" size="lg" align="stretch">
 *   <AuroraDemo />
 * </ComponentPreview>
 * ```
 *
 * `src` is the demo file shown on the Code tab, relative to the repo root.
 * `size` sets the stage height (`full` is a fixed, taller stage for
 * backgrounds); `align="stretch"` lets the demo fill the stage edge to edge
 * instead of centring it with padding. The demo mounts when the stage
 * nears the viewport, and Replay remounts it.
 *
 * `controls` adds a knobs rail: a plain schema from `@/lib/preview-controls`
 * that the demo reads with `usePreviewValue`. It stays serialisable, so
 * this component stays a Server Component.
 */
export const ComponentPreview = async ({
  src,
  size = "md",
  align = "center",
  controls,
  className,
  children,
}: {
  src?: string;
  size?: PreviewSize;
  align?: PreviewAlign;
  controls?: PreviewControlSet;
  className?: string;
  children: ReactNode;
}) => {
  const raw = src ? await readOptionalFromRoot(src) : null;
  if (src && raw === null) {
    throw new Error(`ComponentPreview: no file at "${src}"`);
  }
  const code = raw === null ? null : await formatCode(raw);
  const codeHtml = code === null ? null : await highlightCode(code, "tsx");

  return (
    <ComponentPreviewFrame
      code={code}
      codeHtml={codeHtml}
      size={size}
      align={align}
      controls={controls}
      className={className}
    >
      {children}
    </ComponentPreviewFrame>
  );
};
