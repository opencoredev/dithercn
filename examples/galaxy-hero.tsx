"use client";

import { useEffect, useRef, useState } from "react";

import { Galaxy } from "@/components/dithercn/galaxy";

// Wide boxes put the galaxy high on the right, beside the copy. Narrow ones
// stack the copy at the bottom, so the galaxy moves to the top centre.
const WIDE = { center: [0.74, 0.38], size: 0.4 } as const;
const NARROW = { center: [0.5, 0.22], size: 0.3 } as const;

export default function GalaxyHero() {
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
      <Galaxy
        center={layout.center}
        size={layout.size}
        stars={0.4}
        tilt={48}
        angle={150}
        direction="counterclockwise"
        className="absolute inset-0 -z-10"
      />
      <div className="flex max-w-xs flex-col gap-3">
        <h3 className="text-3xl font-medium tracking-[-0.03em] text-balance">
          Every region, one console
        </h3>
        <p className="text-muted-foreground text-sm text-pretty">
          On a wide screen the galaxy sits high on the right with its long axis
          turned away from the copy. On a narrow one it moves above the text, so
          the arms never run behind it.
        </p>
      </div>
    </section>
  );
}
