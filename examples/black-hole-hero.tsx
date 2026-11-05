"use client";

import { useEffect, useRef, useState } from "react";

import { BlackHole } from "@/components/dithercn/black-hole";

// Wide boxes put the hole on the right, beside the copy. Narrow ones stack
// the copy at the bottom, so the hole moves to the top centre.
const WIDE = { center: [0.8, 0.48], size: 0.42 } as const;
const NARROW = { center: [0.5, 0.28], size: 0.46 } as const;

export default function BlackHoleHero() {
  const ref = useRef<HTMLElement>(null);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setNarrow(entry.contentRect.width < 560);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const layout = narrow ? NARROW : WIDE;

  return (
    <section
      ref={ref}
      className={`relative isolate flex size-full flex-col ${narrow ? "justify-end p-8" : "justify-center p-12"}`}
    >
      <BlackHole
        center={layout.center}
        size={layout.size}
        tilt={76}
        angle={98}
        stars={0.6}
        palette={[
          "--dither-paper",
          "color-mix(in oklch, var(--dither-ink) 45%, var(--dither-paper))",
          "--dither-ink",
        ]}
        className="absolute inset-0 -z-10"
      />
      <div className="flex max-w-xs flex-col gap-3">
        <h3 className="text-3xl font-medium tracking-[-0.03em] text-balance">
          Nothing escapes the index
        </h3>
        <p className="text-muted-foreground text-sm text-pretty">
          On a wide screen the hole sits on the right with its dim side towards
          the copy. On a narrow one it moves above the text, so the disk never
          runs behind it.
        </p>
      </div>
    </section>
  );
}
