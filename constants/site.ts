// Set SITE_URL (or deploy on Vercel) to get real canonical URLs.
export const FALLBACK_SITE_ORIGIN = "http://localhost:3000" as const;

const getBaseUrl = () => {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL;
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  return FALLBACK_SITE_ORIGIN;
};

const baseUrl = getBaseUrl();

/**
 * The origin install commands and registry items point at. Unlike the
 * canonical URL, a Vercel preview uses its own deployment, so a command
 * copied from a preview installs that preview's code. scripts/build-registry.ts
 * uses the same rule. Each variable is read literally so Next inlines it into
 * client components (next.config.mjs passes them through).
 */
export const getRegistryOrigin = (): string => {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/$/u, "");
  }
  if (process.env.VERCEL_ENV === "production") {
    const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    return host ? `https://${host}` : FALLBACK_SITE_ORIGIN;
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return FALLBACK_SITE_ORIGIN;
};

export const SITE = {
  AUTHOR: {
    NAME: "Leo",
    URL: "https://github.com/leoisadev1",
  },
  DESCRIPTION: {
    LONG: "Add dithers to anything in your app. dithercn gives your coding agent the primitives: a dither engine and a skill that teaches it. Ask for any dither and your agent builds it on the engine, in your shadcn theme. The backgrounds, charts and interface pieces in the docs are examples.",
    SHORT: "Add dithers to anything in your app",
  },
  KEYWORDS: [
    "dither",
    "dither engine",
    "agent skill",
    "dithering",
    "bayer dither",
    "ordered dithering",
    "floyd-steinberg",
    "shadcn",
    "shadcn registry",
    "dithered gradient",
    "dashboard charts",
    "landing page background",
    "npx shadcn add",
  ] as const,
  NAME: "dithercn",
  OG_IMAGE: `${baseUrl}/og`,
  REGISTRY: `${getRegistryOrigin()}/r`,
  URL: baseUrl,
};

export const META_THEME_COLORS = {
  dark: "#000000",
  light: "#fafafa",
};

export const UTM_PARAMS = {
  utm_source: new URL(baseUrl).hostname,
};
