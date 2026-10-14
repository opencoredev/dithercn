import { ROUTES } from "@/constants/routes";
import { formatLabelFromSlug } from "@/lib/utils";

export const DOCS_DIR = `content${ROUTES.DOCS}`;

/** The folder holding the catalog page. The docs sidebar files every catalog group under it. */
export const EXAMPLES_FOLDER_ID = "examples";

/**
 * Folders of guides rather than components: "Get started", "Engine" and the "Examples" catalog page.
 * Every other folder in the page tree is a catalog group.
 */
export const GUIDE_FOLDER_IDS: readonly string[] = [
  "(root)",
  "engine",
  EXAMPLES_FOLDER_ID,
];

const TITLE_OVERRIDES: Record<string, string> = {
  ai: "AI",
  ui: "UI",
};

export const formatTitleFromSlug = (slug: string): string =>
  TITLE_OVERRIDES[slug] ?? formatLabelFromSlug(slug);

export const homeContentRoute = `${ROUTES.LLMS_MD}/content.md`;
export const docsContentRoute = `${ROUTES.LLMS_MD}${ROUTES.DOCS}`;
export const docsImageRoute = `${ROUTES.OG}${ROUTES.DOCS}`;
