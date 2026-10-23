import type { InferPageType } from "fumadocs-core/source";
import { loader } from "fumadocs-core/source";

import { docs } from "@/.source/server";
import { ROUTES } from "@/constants/routes";
import { AGENT_DOCS_DIRECTIVE_MARKDOWN } from "@/lib/agent-discovery/directive";
import {
  exampleNotice,
  expandDocsComponents,
  installedItem,
} from "@/lib/agent-discovery/docs-markdown";
import type { MarkdownTarget } from "@/lib/agent-discovery/docs-markdown";
import { propsTablesToMarkdown } from "@/lib/agent-discovery/props-table-markdown";
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

/** Docs sections that hold example components rather than guides. */
const EXAMPLE_SECTIONS: ReadonlySet<string> = new Set([
  "backgrounds",
  "charts",
  "interface",
  "text",
  "images",
]);

export const isExamplePage = (page: InferPageType<typeof source>) =>
  EXAMPLE_SECTIONS.has(page.slugs[0] ?? "");

export const getLLMText = async (
  page: InferPageType<typeof source>,
  target: MarkdownTarget = "page"
) => {
  const processed = await page.data.getText("processed");
  const isExample = isExamplePage(page);
  const body = await expandDocsComponents({
    isExample,
    markdown: propsTablesToMarkdown(processed),
    target,
  });

  const sections = [
    page.data.description,
    AGENT_DOCS_DIRECTIVE_MARKDOWN,
    isExample ? exampleNotice(installedItem(processed)) : "",
    body.trim(),
  ].filter(Boolean);

  return `# ${page.data.title}

${sections.join("\n\n")}`;
};
