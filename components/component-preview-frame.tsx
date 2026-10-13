"use client";

import {
  ArrowShrink02Icon,
  FullScreenIcon,
  RefreshIcon,
  SlidersHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import type { ReactNode, UIEvent } from "react";

import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icon";
import {
  PreviewControlsPanel,
  PreviewControlsProvider,
} from "@/components/preview-controls";
import type { PreviewControlsLayout } from "@/components/preview-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PreviewControlSet, PreviewValue } from "@/lib/preview-controls";
import { cn } from "@/lib/utils";

/*
 * Direction: a gallery stage, after grainient.supply's component pages and
 * Geist's docs. The demo sits alone on a borderless 20px plate (bg-card,
 * #141414 on the black site); the chrome above it is quiet text and one
 * segmented control, so the dither is the only thing with colour.
 * Expand lifts the same plate to fill the window, knobs alongside.
 * Avoiding: dashed outlines, drop shadows, toolbars inside the stage.
 */

export type PreviewSize = "sm" | "md" | "lg" | "full";
export type PreviewAlign = "center" | "stretch";

const SIZE_CLASS = {
  full: "h-[420px] sm:h-[520px]",
  lg: "min-h-[440px] sm:min-h-[480px]",
  md: "min-h-[300px] sm:min-h-[360px]",
  sm: "min-h-[220px] sm:min-h-[260px]",
} as const satisfies Record<PreviewSize, string>;

// Safe centring keeps an over-wide demo's left edge in view, and
// `max-w-full` asks it to shrink to the stage before it overflows at all.
const ALIGN_CLASS = {
  center:
    "flex items-center-safe justify-center-safe p-6 sm:p-10 *:max-w-full *:min-w-0",
  stretch: "grid *:min-h-0 *:min-w-0",
} as const satisfies Record<PreviewAlign, string>;

/*
 * `overflow: clip` rather than `hidden`: a hidden box is still a scroll
 * container, so focus, find-in-page, a screen reader's cursor or a chart's
 * sr-only data table scrolled into view could slide the demo sideways and
 * leave it stuck there. A clipped box cannot scroll at all. Browsers
 * without `clip` keep `hidden`, and `pinScroll` undoes any scroll there.
 */
const STAGE_CLASS =
  "relative isolate w-full min-w-0 overflow-hidden supports-[overflow:clip]:overflow-clip supports-[overflow:clip]:[overflow-clip-margin:6px]";

const pinScroll = (event: UIEvent<HTMLDivElement>) => {
  const el = event.currentTarget;
  if (el.scrollLeft !== 0 || el.scrollTop !== 0) {
    el.scrollTo(0, 0);
  }
};

/** Mounts `children` once the stage comes within 200px of the viewport. */
const useNearViewport = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || isNear) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsNear(true);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isNear]);

  return { isNear, ref };
};

const TRIGGER_CLASS =
  "text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:bg-background h-7 flex-none rounded-full border-0 px-3 text-[0.8rem] transition-colors duration-150 data-[state=active]:shadow-none dark:data-[state=active]:border-0";

const TOOL_BUTTON =
  "text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-full px-2.5 text-[0.8rem] font-medium transition-[color,scale] duration-150 outline-none focus-visible:ring-[3px] active:scale-[0.96] sm:px-3";

/** Visible from `sm` up; below that the button shows its icon only. */
const TOOL_LABEL = "max-sm:sr-only";

const ControlsButton = ({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    aria-expanded={open}
    onClick={onToggle}
    className={cn(TOOL_BUTTON, open && "text-foreground")}
  >
    <Icon icon={SlidersHorizontalIcon} className="size-3.5" />
    <span className={TOOL_LABEL}>Controls</span>
  </button>
);

const ReplayButton = ({ onReplay }: { onReplay: () => void }) => (
  <button
    type="button"
    onClick={onReplay}
    className={cn("group/replay", TOOL_BUTTON)}
  >
    <Icon
      icon={RefreshIcon}
      className="size-3.5 transition-transform duration-300 ease-(--ease-out) group-active/replay:-rotate-90 motion-reduce:transition-none"
    />
    <span className={TOOL_LABEL}>Replay</span>
  </button>
);

export const ComponentPreviewFrame = ({
  children,
  code,
  codeHtml,
  size,
  align,
  controls,
  className,
}: {
  children: ReactNode;
  code: string | null;
  codeHtml: string | null;
  size: PreviewSize;
  align: PreviewAlign;
  controls?: PreviewControlSet;
  className?: string;
}) => {
  const [tab, setTab] = useState("preview");
  const [run, setRun] = useState(0);
  const [values, setValues] = useState<Record<string, PreviewValue>>({});
  const [panelOpen, setPanelOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const { isNear, ref } = useNearViewport();
  const controlList = controls ?? [];
  const hasControls = controlList.length > 0;
  const showPanel = hasControls && panelOpen;

  const replay = () => setRun((count) => count + 1);
  const togglePanel = () => setPanelOpen((open) => !open);

  // One copy of the demo at a time: the inline stage empties while the
  // full-screen one is open, so a shader holds one WebGL context, not two.
  const demo = (
    <PreviewControlsProvider values={values}>
      <div key={run} className="contents">
        {children}
      </div>
    </PreviewControlsProvider>
  );

  const panel = (layout: PreviewControlsLayout) =>
    showPanel ? (
      <PreviewControlsPanel
        controls={controlList}
        values={values}
        onChange={(id, value) =>
          setValues((current) => ({ ...current, [id]: value }))
        }
        onReset={() => setValues({})}
        layout={layout}
      />
    ) : null;

  return (
    <DialogPrimitive.Root open={expanded} onOpenChange={setExpanded}>
      <Tabs
        value={tab}
        onValueChange={setTab}
        className={cn("not-first:mt-6 gap-3", className)}
      >
        <div className="flex items-center justify-between gap-3">
          <TabsList className="bg-muted/70 h-8 rounded-full p-0.5">
            <TabsTrigger value="preview" className={TRIGGER_CLASS}>
              Preview
            </TabsTrigger>
            {code ? (
              <TabsTrigger value="code" className={TRIGGER_CLASS}>
                Code
              </TabsTrigger>
            ) : null}
          </TabsList>
          {tab === "preview" ? (
            <div className="flex items-center">
              {hasControls ? (
                <ControlsButton open={panelOpen} onToggle={togglePanel} />
              ) : null}
              <ReplayButton onReplay={replay} />
              <DialogPrimitive.Trigger
                aria-label="Expand preview"
                title="Expand"
                className={TOOL_BUTTON}
              >
                <Icon icon={FullScreenIcon} className="size-3.5" />
                <span className={TOOL_LABEL} aria-hidden>
                  Expand
                </span>
              </DialogPrimitive.Trigger>
            </div>
          ) : null}
        </div>
        <TabsContent
          value="preview"
          forceMount
          className="data-[state=inactive]:hidden"
        >
          <div className="bg-card text-card-foreground w-full overflow-clip rounded-[20px] [--dither-paper:var(--card)]">
            <div
              ref={ref}
              onScroll={pinScroll}
              className={cn(STAGE_CLASS, SIZE_CLASS[size], ALIGN_CLASS[align])}
            >
              {isNear && !expanded ? demo : null}
            </div>
            {expanded ? null : panel("tray")}
          </div>
        </TabsContent>
        {code && codeHtml ? (
          <TabsContent value="code">
            <figure
              data-rehype-pretty-code-figure=""
              className="mx-0! mt-0! rounded-[20px]! [&_pre]:max-h-[480px] [&_pre]:overflow-auto"
            >
              <CopyButton
                value={code}
                event="copy_primitive_code"
                className="top-3 right-3"
              />
              <div dangerouslySetInnerHTML={{ __html: codeHtml }} />
            </figure>
          </TabsContent>
        ) : null}
      </Tabs>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-background/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 duration-200 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] data-[state=closed]:zoom-out-[0.98] fixed inset-0 z-50 flex flex-col gap-3 overscroll-contain p-3 duration-200 ease-(--ease-out) outline-none motion-reduce:animate-none sm:p-4"
        >
          <div className="flex h-8 shrink-0 items-center justify-between gap-3 pl-2">
            <DialogPrimitive.Title className="text-muted-foreground font-mono text-[11px] tracking-[0.08em] uppercase">
              Preview
            </DialogPrimitive.Title>
            <div className="flex items-center">
              {hasControls ? (
                <ControlsButton open={panelOpen} onToggle={togglePanel} />
              ) : null}
              <ReplayButton onReplay={replay} />
              <DialogPrimitive.Close
                aria-label="Exit full screen"
                title="Exit full screen (Esc)"
                className={TOOL_BUTTON}
              >
                <Icon icon={ArrowShrink02Icon} className="size-3.5" />
                <span className={TOOL_LABEL} aria-hidden>
                  Close
                </span>
              </DialogPrimitive.Close>
            </div>
          </div>
          <div className="bg-card text-card-foreground flex min-h-0 flex-1 flex-col overflow-clip rounded-[20px] [--dither-paper:var(--card)] lg:flex-row">
            <div
              onScroll={pinScroll}
              className={cn(STAGE_CLASS, "min-h-0 flex-1", ALIGN_CLASS[align])}
            >
              {demo}
            </div>
            {showPanel ? (
              <div className="lg:border-border/70 max-h-[42dvh] shrink-0 overflow-y-auto overscroll-contain lg:max-h-none lg:w-80 lg:border-l">
                {panel("sidebar")}
              </div>
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
