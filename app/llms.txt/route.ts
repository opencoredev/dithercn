import { llms } from "fumadocs-core/source";

import { LINK } from "@/constants/links";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";
import { agentStartHere } from "@/lib/agent-discovery/agent-guide";
import { requestOrigin } from "@/lib/agent-discovery/request-origin";
import { source } from "@/lib/source";

export const revalidate = false;

const documentationIndex = (base: string) =>
  llms(source)
    .index()
    .replace(/^#\s+(.+)$/m, "## $1")
    .replaceAll(
      /\]\((\/docs(?:\/[^)#\s]+)?)(#[^)]+)?\)/g,
      (_, pathname, hash = "") => `](${base}${pathname}.md${hash})`
    )
    .trim();

const docsIndex = (origin: string) => {
  const base = origin.replace(/\/$/, "");

  return `# ${SITE.NAME}

> ${SITE.DESCRIPTION.LONG} Use this index to discover the available documentation pages, markdown mirrors, and registry resources before browsing.

${agentStartHere(base)}

## When to use dithercn

Use dithercn when a user asks for:

- A dithered, Bayer, halftone, ordered-dither or pixel texture anywhere in a React or shadcn/ui app
- A dithered hero or section background, such as an aurora, gradient, globe, starfield or waves
- Charts and status displays with a dithered fill: area, bar, line, donut, gauge, heatmap, sparkline, progress and uptime bars
- Interface pieces with a dithered finish, such as cards, buttons, loaders, skeletons and avatars
- Display text or images drawn, revealed or converted with a dither, and PNG, SVG or CSS exports of any dither

Install the skill first, then build on the engine in \`lib/dither\`. Start from the closest example only when one fits; otherwise write a new field.

## Official CLI

dithercn has no CLI of its own. It installs with two official CLIs:

- shadcn CLI, for the engine, the skill and any example: \`npx shadcn@latest add ${SITE.REGISTRY}/dithercn-skill.json\` (or any \`${SITE.REGISTRY}/<name>.json\` from the [registry index](${base}${ROUTES.REGISTRY}))
- skills CLI, for the agent skill alone in Claude Code, Codex, Cursor, Gemini CLI and others: \`npx skills add ${base}\`

${documentationIndex(base)}

## About

- [About dithercn](${base}/about.md): who makes it and why
- [Contact](${base}/contact.md): bugs, email and security reports
- [Privacy](${base}/privacy.md): what the site collects

## Machine-readable Resources

- [Full documentation](${base}${ROUTES.LLMS_FULL})
- [Homepage markdown](${base}${ROUTES.LLMS_MD}/content.md)
- [OpenAPI description](${base}${ROUTES.OPENAPI})
- [API catalog](${base}${ROUTES.API_CATALOG})
- [dithercn agent skill](${base}${ROUTES.AGENT_SKILL}): build any dither on the engine
- [shadcn MCP server documentation](${LINK.SHADCN_MCP_DOCS})
`;
};

export const GET = (request: Request) =>
  new Response(docsIndex(requestOrigin(request)), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
