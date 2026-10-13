"use client";

import { useEffect, useState } from "react";

import { DitherNumber } from "@/components/dithercn/dither-number";
import { fillStyle } from "@/lib/dither";

export default function DitherNumberLanding() {
  const [frames, setFrames] = useState(2_418_906);

  // Ticks up like a live counter once it has rolled in.
  useEffect(() => {
    const timer = setInterval(
      () => setFrames((value) => value + 120 + Math.round(Math.random() * 900)),
      1800
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative flex w-full flex-col items-center gap-3 overflow-hidden px-6 py-10 text-center">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2 opacity-60"
        style={fillStyle("gradient", { edge: "bottom", length: 40, to: 0 })}
      />
      <span className="text-muted-foreground relative font-mono text-xs tracking-[0.16em] uppercase">
        This week
      </span>
      <DitherNumber
        value={frames}
        locales="en-US"
        size="display"
        stagger={60}
        duration={1400}
        className="relative"
      />
      <p className="text-muted-foreground relative max-w-sm text-sm text-pretty sm:text-base">
        frames dithered by teams shipping with dithercn, counted live.
      </p>
    </section>
  );
}
