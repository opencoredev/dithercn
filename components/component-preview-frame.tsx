"use client";

import { RefreshIcon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/*
 * Direction: a gallery stage, after grainient.supply's component pages and
 * Geist's docs. The demo sits alone on a borderless 20px plate (bg-card,
 * #141414 on the black site); the chrome above it is quiet text and one
 * segmented control, so the dither is the only thing with colour.
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

const ALIGN_CLASS = {
  center: "flex items-center justify-center p-6 sm:p-10",
  stretch: "grid *:min-h-0 *:min-w-0",
} as const satisfies Record<PreviewAlign, string>;

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

export const ComponentPreviewFrame = ({
  children,
  code,
  codeHtml,
  size,
  align,
  className,
}: {
  children: React.ReactNode;
  code: string | null;
  codeHtml: string | null;
  size: PreviewSize;
  align: PreviewAlign;
  className?: string;
}) => {
  const [tab, setTab] = useState("preview");
  const [run, setRun] = useState(0);
  const { isNear, ref } = useNearViewport();

  return (
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
          <button
            type="button"
            onClick={() => setRun((count) => count + 1)}
            className="group/replay text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8rem] font-medium transition-[color,scale] duration-150 outline-none focus-visible:ring-[3px] active:scale-[0.96]"
          >
            <Icon
              icon={RefreshIcon}
              className="size-3.5 transition-transform duration-300 ease-(--ease-out) group-active/replay:-rotate-90 motion-reduce:transition-none"
            />
            Replay
          </button>
        ) : null}
      </div>
      <TabsContent
        value="preview"
        forceMount
        className="data-[state=inactive]:hidden"
      >
        <div
          ref={ref}
          className={cn(
            "bg-card text-card-foreground relative isolate w-full overflow-hidden rounded-[20px] [--dither-paper:var(--card)]",
            SIZE_CLASS[size],
            ALIGN_CLASS[align]
          )}
        >
          {isNear ? (
            <div key={run} className="contents">
              {children}
            </div>
          ) : null}
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
  );
};
