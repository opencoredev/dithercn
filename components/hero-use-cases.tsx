"use client";

import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/lib/dither";
import { cn } from "@/lib/utils";

const USE_CASES = [
  "hero backgrounds",
  "area charts",
  "skeleton loaders",
  "uptime bars",
  "logo walls",
  "headlines",
] as const;

const INTERVAL_MS = 2400;
/** One full pass, then it rests on the first word again. */
const STEPS = USE_CASES.length;

/**
 * "Ask for <use case>", rotating. Every word sits in the same grid cell, so
 * the slot is as wide as the longest one and the outgoing word fades out
 * upwards while the next rises in: the line never shifts and never goes
 * blank.
 * It plays one pass and stops, and pauses while hovered, so nobody has to
 * chase it (WCAG 2.2.2). Reduced motion holds the first word. Screen readers
 * get the list once.
 */
export const HeroUseCases = ({ className }: { className?: string }) => {
  const [step, setStep] = useState(0);
  const [hovered, setHovered] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const done = step >= STEPS;

  useEffect(() => {
    if (reducedMotion || hovered || done) {
      return;
    }
    const timer = setTimeout(
      () => setStep((current) => current + 1),
      INTERVAL_MS
    );
    return () => clearTimeout(timer);
  }, [reducedMotion, hovered, done, step]);

  const shown = reducedMotion ? 0 : step % USE_CASES.length;
  const leaving = (shown + USE_CASES.length - 1) % USE_CASES.length;
  const stateOf = (index: number) => {
    if (index === shown) {
      return "active";
    }
    return index === leaving ? "leaving" : "waiting";
  };

  return (
    <p
      className={className}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <span className="sr-only">Ask for {USE_CASES.join(", ")}.</span>
      <span aria-hidden="true" className="inline-flex items-baseline gap-[1ch]">
        Ask for
        <span className="inline-grid text-left">
          {USE_CASES.map((useCase, index) => (
            <span
              key={useCase}
              data-state={stateOf(index)}
              className={cn(
                "text-foreground col-start-1 row-start-1 whitespace-nowrap",
                "transition-[opacity,translate,filter] duration-500 ease-(--ease-out) motion-reduce:transition-none",
                "data-[state=leaving]:-translate-y-1.5 data-[state=waiting]:translate-y-1.5 data-[state=leaving]:opacity-0 data-[state=waiting]:opacity-0 data-[state=leaving]:blur-[3px] data-[state=waiting]:blur-[3px]"
              )}
            >
              {useCase}
            </span>
          ))}
        </span>
      </span>
    </p>
  );
};
