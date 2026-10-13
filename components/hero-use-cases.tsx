"use client";

import { motion } from "motion/react";

import { TextFlip } from "@/components/ui/text-flip";

const USE_CASES = [
  "hero backgrounds",
  "area charts",
  "skeleton loaders",
  "uptime bars",
  "logo walls",
  "headlines",
];

/**
 * "Made for <use case>", rotating. It sits at the end of its own line so the
 * swap never reflows other text. Screen readers get the whole list once.
 */
export const HeroUseCases = ({ className }: { className?: string }) => (
  <p className={className}>
    <span className="sr-only">Made for {USE_CASES.join(", ")}.</span>
    <span aria-hidden="true">
      Made for{" "}
      <TextFlip
        as={motion.span}
        interval={2.4}
        className="text-foreground whitespace-nowrap"
      >
        {USE_CASES}
      </TextFlip>
    </span>
  </p>
);
