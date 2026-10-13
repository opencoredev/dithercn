import { ROUTES } from "@/constants/routes";
import { formatLabelFromSlug } from "@/lib/utils";

export const DOCS_DIR = `content${ROUTES.DOCS}`;

/** The "Get started" folder. Everything else in the page tree is catalog. */
export const GUIDE_FOLDER_ID = "(root)";

const TITLE_OVERRIDES: Record<string, string> = {
  ai: "AI",
  ui: "UI",
};

export const formatTitleFromSlug = (slug: string): string =>
  TITLE_OVERRIDES[slug] ?? formatLabelFromSlug(slug);

export const homeContentRoute = `${ROUTES.LLMS_MD}/content.md`;
export const docsContentRoute = `${ROUTES.LLMS_MD}${ROUTES.DOCS}`;
export const docsImageRoute = `${ROUTES.OG}${ROUTES.DOCS}`;
