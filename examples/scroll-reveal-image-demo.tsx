"use client";

import { useRef, useState } from "react";

import { ScrollRevealImage } from "@/components/dithercn/scroll-reveal-image";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/scroll-reveal-image-controls";

const Lines = ({ widths }: { widths: readonly string[] }) => (
  <div aria-hidden className="flex flex-col gap-2">
    {widths.map((width) => (
      <div
        key={width}
        className="bg-muted h-2 rounded-full"
        style={{ width }}
      />
    ))}
  </div>
);

export default function ScrollRevealImageDemo() {
  const preset = usePreviewValue(knobs.preset);
  const color = usePreviewValue(knobs.ink);
  const end = usePreviewValue(knobs.end);
  const coarsest = usePreviewValue(knobs.coarsest);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  return (
    <div className="relative w-full max-w-lg">
      <div
        ref={scrollRef}
        // Browsers make scroll containers keyboard-focusable on their own.
        role="region"
        aria-label="Sample article. Scroll to reveal the photo."
        className="bg-background focus-visible:ring-ring h-[400px] overflow-y-auto overscroll-contain rounded-xl border outline-none focus-visible:ring-2"
      >
        <div className="flex flex-col gap-6 px-6 pt-8 pb-40">
          <span className="text-muted-foreground font-mono text-xs">
            Scroll this article ↓
          </span>
          <h3 className="text-2xl font-medium tracking-tight text-balance">
            The range Ansel Adams came back to
          </h3>
          <Lines widths={["100%", "94%", "97%", "62%"]} />
          <Lines widths={["98%", "100%", "88%", "92%", "40%"]} />
          <div className="h-32" />
          <ScrollRevealImage
            src="/examples/tetons.jpg"
            alt="The Grand Teton range above a bend in the Snake River"
            preset={preset}
            color={color}
            end={end}
            coarsest={coarsest}
            scrollRoot={scrollRef}
            onProgressChange={setProgress}
            ratio={5 / 4}
            className="w-full rounded-lg"
          />
          <Lines widths={["96%", "100%", "71%"]} />
        </div>
      </div>
      <div
        aria-hidden
        className="bg-background/80 pointer-events-none absolute right-3 bottom-3 flex items-center gap-2 rounded-md border px-2 py-1 font-mono text-[11px] tabular-nums backdrop-blur-sm"
      >
        <span className="text-muted-foreground">resolve</span>
        <span>{String(Math.round(progress * 100)).padStart(3, " ")}%</span>
      </div>
    </div>
  );
}
