"use client";

import Lenis from "lenis";
import { useEffect } from "react";

import "lenis/dist/lenis.css";

/**
 * Lenis smooth scrolling for the page that mounts it (the landing page).
 * Docs pages keep native scrolling because of their nested scroll areas.
 * Skipped when the visitor prefers reduced motion; destroyed on unmount so
 * client navigation hands back native scrolling.
 */
export const SmoothScroll = () => {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const lenis = new Lenis({
      allowNestedScroll: true,
      anchors: true,
      autoRaf: true,
      lerp: 0.1,
    });
    return () => lenis.destroy();
  }, []);

  return null;
};
