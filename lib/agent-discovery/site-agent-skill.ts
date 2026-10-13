import { createHash } from "node:crypto";

import { LINK } from "@/constants/links";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";

export const SITE_AGENT_SKILL_MD = `# ${SITE.NAME}

## Summary

${SITE.NAME} is a shadcn registry of dithered backgrounds, charts, interface pieces, text effects and images for landing pages and dashboards. Help users discover components and install them with the shadcn CLI.

## What installs

Every component depends on \`dither-core\` (the engine, in \`lib/dither\`) and \`dither-tokens\` (the CSS variables \`--dither-ink\`, \`--dither-paper\`, \`--dither-cell\`); the CLI installs both automatically. The registry index lists every installable item.

## Registry

- Registry index: \`${SITE.URL}${ROUTES.REGISTRY}\`
- Item URL pattern: \`${SITE.REGISTRY}/{name}.json\`
- Docs index for agents: \`${SITE.URL}${ROUTES.LLMS}\`

## Install

\`\`\`bash
npx shadcn@latest add ${SITE.REGISTRY}/dither-gradient.json
\`\`\`

Or add \`"@dithercn": "${SITE.REGISTRY}/{name}.json"\` to the \`registries\` field of the user's components.json and run \`npx shadcn@latest add @dithercn/dither-gradient\`.

## MCP

Once the namespace is configured, the shadcn MCP server can browse and install from it: ${LINK.SHADCN_MCP_DOCS}

## Theming

Pieces read \`--dither-ink\` (default \`var(--primary)\`) and \`--dither-paper\` (default \`var(--background)\`). To retint one section, set those variables on a wrapper element. See ${SITE.URL}${ROUTES.DOCS_THEMING}.md
`;

export const siteAgentSkillDigest = (): string => {
  const hex = createHash("sha256")
    .update(SITE_AGENT_SKILL_MD, "utf-8")
    .digest("hex");

  return `sha256:${hex}`;
};
