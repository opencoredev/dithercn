import { existsSync } from "node:fs";
import path from "node:path";

/** The site themes each catalog screenshot is captured in. */
export const PREVIEW_THEMES = ["dark", "light"] as const;
export type PreviewTheme = (typeof PREVIEW_THEMES)[number];

export { PREVIEW_HEIGHT, PREVIEW_WIDTH } from "@/lib/catalog-preview-size";

/** Public path of a docs page's catalog screenshot in one theme. */
export const previewSrc = (url: string, theme: PreviewTheme) =>
  `/catalog${url.replace(/^\/docs/u, "")}-${theme}.webp`;

/** Whether `pnpm catalog:capture` has made both screenshots for a page. */
export const hasPreview = (url: string) =>
  PREVIEW_THEMES.every((theme) =>
    existsSync(path.join(process.cwd(), "public", previewSrc(url, theme)))
  );
