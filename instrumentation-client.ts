import { posthog } from "posthog-js";

import {
  POSTHOG_KEY,
  POSTHOG_PROXY_PATH,
  POSTHOG_UI_HOST,
} from "@/lib/analytics/config";
import type { EventProperties } from "@/lib/events";
import { trackEvent } from "@/lib/events";

posthog.init(POSTHOG_KEY, {
  api_host: POSTHOG_PROXY_PATH,
  autocapture: true,
  capture_pageleave: true,
  // The first load and every App Router navigation (history change).
  capture_pageview: "history_change",
  capture_performance: { web_vitals: true },
  // The privacy page promises no session recording.
  disable_session_recording: true,
  person_profiles: "always",
  ui_host: POSTHOG_UI_HOST,
});

// Server-rendered links can't take an onClick, so they declare their event
// in data attributes instead: data-track="github_link_clicked" plus
// data-track-location="navbar" sends { location: "navbar" }.
const TRACKED = new Set([
  "example_card_clicked",
  "github_link_clicked",
] as const);
type TrackedName = typeof TRACKED extends Set<infer T> ? T : never;

const isTracked = (value: string | undefined): value is TrackedName =>
  [...TRACKED].some((name) => name === value);

const snakeCase = (key: string) =>
  key
    .replace(/^track/, "")
    .replaceAll(/[A-Z]/g, (c, i: number) =>
      i === 0 ? c.toLowerCase() : `_${c.toLowerCase()}`
    );

document.addEventListener(
  "click",
  (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const el = event.target.closest<HTMLElement>("[data-track]");
    const name = el?.dataset.track;
    if (!el || !isTracked(name)) {
      return;
    }
    const properties: EventProperties = {};
    for (const [key, value] of Object.entries(el.dataset)) {
      if (key !== "track" && key.startsWith("track") && value !== undefined) {
        properties[snakeCase(key)] = value;
      }
    }
    trackEvent({ name, properties });
  },
  { capture: true }
);
