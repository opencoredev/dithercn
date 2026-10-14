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
