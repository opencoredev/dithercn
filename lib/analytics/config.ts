// PostHog project "dithercn" (us.posthog.com, project 688412). The project
// token is public by design: it only writes events. The env vars win, so a
// fork or preview can point somewhere else.
export const POSTHOG_KEY =
  process.env.NEXT_PUBLIC_POSTHOG_KEY ||
  "phc_vKcTqsEGdtSRF5vzxKnEzpJbp93oVZ4dP9JEnUXPaEiW";

export const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

/** First-party path the browser sends events to; next.config.mjs proxies it. */
export const POSTHOG_PROXY_PATH = "/ingest";

export const POSTHOG_UI_HOST = "https://us.posthog.com";
