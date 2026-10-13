"use client";

import { useRouter } from "next/navigation";
import { addTransitionType, startTransition } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { trackEvent } from "@/lib/events";

/** Widgets that use the arrow keys themselves: charts, knobs, sliders. */
const ARROW_WIDGETS =
  "input, select, textarea, [contenteditable=true], [role=radiogroup], [role=slider], [role=tablist], [role=group][tabindex]";

/** Page navigation only when no focused widget has claimed the arrow key. */
const isPageLevelKey = (event: KeyboardEvent) => {
  if (event.defaultPrevented) {
    return false;
  }
  const { target } = event;
  return !(target instanceof Element && target.closest(ARROW_WIDGETS));
};

export const DocsKeyboardShortcuts = ({
  previous,
  next,
}: {
  previous: string | null;
  next: string | null;
}) => {
  const router = useRouter();

  const navigate = (
    href: string | null,
    direction: "previous" | "next",
    keys: string
  ) => {
    if (href) {
      trackEvent({
        name: "keyboard_shortcut_navigate",
        properties: { direction, keys, path: href },
      });
      startTransition(() => {
        addTransitionType(direction === "next" ? "nav-forward" : "nav-back");
        router.push(href);
      });
    }
  };

  useHotkeys(
    "ArrowRight",
    () => {
      navigate(next, "next", "ArrowRight");
    },
    { enabled: isPageLevelKey, preventDefault: true }
  );

  useHotkeys(
    "ArrowLeft",
    () => {
      navigate(previous, "previous", "ArrowLeft");
    },
    { enabled: isPageLevelKey, preventDefault: true }
  );

  return null;
};
