"use client";

import { useSyncExternalStore } from "react";

import { SITE } from "@/constants/site";

const unsubscribe = () => {
  // The origin never changes while the page is open: nothing to remove.
};
const subscribe = () => unsubscribe;

/**
 * The origin the visitor is reading the site on, for links and commands they
 * copy. Server rendering uses the configured site URL; the browser swaps in
 * its own origin after hydration.
 */
export const useSiteOrigin = (): string =>
  useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => SITE.URL
  );
