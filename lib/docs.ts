import { ROUTES } from "@/constants/routes";
import { formatLabelFromSlug } from "@/lib/utils";

export const DOCS_DIR = `content${ROUTES.DOCS}`;

/**
 * Folders of guides rather than components: "Get started", "Engine" and the "Examples" overview.
 * Every other folder in the page tree is a catalog group.
 */
export const GUIDE_FOLDER_IDS: readonly string[] = [
  "(root)",
  "engine",
  "examples",
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
