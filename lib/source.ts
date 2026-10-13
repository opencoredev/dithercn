import type { InferPageType } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";

import { docs } from "@/.source/server";
import { ROUTES } from "@/constants/routes";
import { AGENT_DOCS_DIRECTIVE_MARKDOWN } from "@/lib/agent-discovery/directive";
import { docsContentRoute, docsImageRoute } from "@/lib/docs";

export const source = loader({
  baseUrl: ROUTES.DOCS,
  source: docs.toFumadocsSource(),
});

export const getPageImage = (page: InferPageType<typeof source>) => {
  const segments = [...page.slugs, "image.png"];

  return {
    segments,
    url: `${docsImageRoute}/${segments.join("/")}`,
  };
};

export const getPageMarkdownUrl = (page: InferPageType<typeof source>) => {
  const segments = [...page.slugs, "content.md"];

  return {
    segments,
    url: `${docsContentRoute}/${segments.join("/")}`,
  };
};

const PLANNED_NOTICE =
  "> **Status: planned.** This piece is not in the registry yet. Do not try to install it; the page describes what is planned.";

export const getLLMText = async (page: InferPageType<typeof source>) => {
  const processed = await page.data.getText("processed");
  const isPlanned = page.data.status === "planned";
  // <ComingSoon /> renders as a notice on the site; in Markdown it is
  // replaced by the explicit status line above.
  const body = processed.replaceAll(/^<ComingSoon \/>\s*$/gm, "").trim();

  const sections = [
    page.data.description,
    isPlanned ? PLANNED_NOTICE : null,
    AGENT_DOCS_DIRECTIVE_MARKDOWN,
    body,
  ].filter(Boolean);

  return `# ${page.data.title}

${sections.join("\n\n")}`;
};
