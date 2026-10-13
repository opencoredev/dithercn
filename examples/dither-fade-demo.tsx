"use client";

import { DitherFade } from "@/components/dithercn/dither-fade";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/dither-fade-controls";

const ENTRIES = [
  {
    body: "A 64 by 64 tile with no visible grid, for grain that reads as film.",
    date: "Oct 9",
    title: "Blue-noise thresholds",
  },
  {
    body: "Pass any number of colours from paper to ink; tones in between snap to the nearest pair.",
    date: "Oct 2",
    title: "Palette ramps",
  },
  {
    body: "Offscreen shaders hand back their WebGL context and show a CSS fallback.",
    date: "Sep 25",
    title: "Context budget",
  },
  {
    body: "Every background holds one still frame when the system asks for less motion.",
    date: "Sep 18",
    title: "Reduced motion",
  },
  {
    body: "Set --dither-cell once and every component follows it.",
    date: "Sep 11",
    title: "Cell size token",
  },
] as const;

export default function DitherFadeDemo() {
  const size = usePreviewValue(knobs.size);
  const matrix = usePreviewValue(knobs.matrix);
  const cell = usePreviewValue(knobs.cell);
  const animate = usePreviewValue(knobs.animate);

  return (
    <div className="relative size-full overflow-hidden px-6 pt-10 sm:px-12">
      <ol className="mx-auto flex max-w-lg flex-col gap-6">
        {ENTRIES.map((entry) => (
          <li key={entry.title} className="grid grid-cols-[4rem_1fr] gap-4">
            <span className="text-muted-foreground pt-0.5 font-mono text-xs">
              {entry.date}
            </span>
            <div className="flex flex-col gap-1">
              <span className="font-medium">{entry.title}</span>
              <span className="text-muted-foreground text-sm text-pretty">
                {entry.body}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <DitherFade size={size} matrix={matrix} cell={cell} animate={animate} />
    </div>
  );
}
