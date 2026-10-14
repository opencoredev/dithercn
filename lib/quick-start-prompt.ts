import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";

/**
 * The prompt the hero's "Copy quick start prompt" button copies, and the
 * Installation page shows. It hands an agent everything it needs to set up
 * dithercn and build a dither without reading the site first.
 *
 * `origin` is the site the visitor is reading, so the copied URLs reach this
 * registry wherever it runs. It defaults to the configured site URL for
 * server rendering.
 */
export const quickStartPrompt = (
  origin: string = SITE.URL
) => `Add dithercn to this project and build me a dither with it.

1. Install the dithercn engine and agent skill with the shadcn CLI:
   npx shadcn@latest add ${origin}/r/dithercn-skill.json
   This writes lib/dither, the skill in .agents/skills/dithercn and .claude/skills/dithercn, and the --dither-* CSS variables. The project needs shadcn/ui, Tailwind CSS v4 and React 19.
2. Read .agents/skills/dithercn/SKILL.md and follow it for everything below. If it isn't on disk, read ${origin}${ROUTES.AGENT_SKILL}. The docs are at ${origin}${ROUTES.DOCS}, and ${origin}${ROUTES.LLMS} lists every page as Markdown.
3. If I haven't said which dither I want and where it goes, ask me in one question, and suggest two or three that would suit this project.
4. Build it on the engine, coloured from my theme. Start from an example component if one is close.
5. Check it in a browser in light and dark mode, at desktop and phone widths and with reduced motion, and fix what doesn't read. Then tell me what you made and where.`;
