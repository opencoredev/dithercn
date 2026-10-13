// No domain yet. Set SITE_URL (or deploy on Vercel) to get real canonical URLs.
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

export const SITE = {
  AUTHOR: {
    NAME: "Leo",
    URL: "https://github.com/leoisadev1",
  },
  DESCRIPTION: {
    LONG: "Beautiful dithers for landing pages and dashboards. dithercn is a dither engine with an agent skill: ask your coding agent for any dither and it builds it on the engine, in your shadcn theme. The backgrounds, charts and interface pieces in the docs are examples.",
    SHORT: "Beautiful dithers for landing pages and dashboards",
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
  REGISTRY: `${baseUrl}/r`,
  URL: baseUrl,
};

export const META_THEME_COLORS = {
  dark: "#000000",
  light: "#fafafa",
};

export const UTM_PARAMS = {
  utm_source: new URL(baseUrl).hostname,
};
