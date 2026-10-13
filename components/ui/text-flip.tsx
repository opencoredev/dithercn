"use client";

import type { Transition, Variants } from "motion/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Children, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const defaultVariants: Variants = {
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  initial: { opacity: 0, y: -8 },
};

type MotionElement = typeof motion.p | typeof motion.span | typeof motion.code;

export interface TextFlipProps {
  as?: MotionElement;
  className?: string;
  children: React.ReactNode[];
  interval?: number;
  transition?: Transition;
  variants?: Variants;
  onIndexChange?: (index: number) => void;
}

export const TextFlip = ({
  as: Component = motion.p,
  className,
  children,
  interval = 2,
  transition = { duration: 0.28, ease: [0.23, 1, 0.32, 1] },
  variants = defaultVariants,
  onIndexChange,
}: TextFlipProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  const items = Children.toArray(children);

  useEffect(() => {
    // Auto-rotating text is motion too: hold the first item still.
    if (prefersReducedMotion) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % items.length;
        onIndexChange?.(next);
        return next;
      });
    }, interval * 1000);

    return () => clearInterval(timer);
  }, [items.length, interval, onIndexChange, prefersReducedMotion]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Component
        key={currentIndex}
        className={cn("inline-block", className)}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
        variants={variants}
      >
        {items[currentIndex]}
      </Component>
    </AnimatePresence>
  );
};
