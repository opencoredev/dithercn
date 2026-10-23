import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";

/**
 * What an agent needs before it reads a single docs page: the examples are
 * references, and the engine is how you build what the user actually asked
 * for. Leads llms.txt and llms-full.txt, which agents are often handed whole.
 */
export const agentStartHere = (base: string) => `## Start here

dithercn is an engine, not a component menu. The components under Backgrounds, Charts, Interface, Text and Images are examples of what the engine draws. When a user asks for a dither, build the one they asked for:

1. Install the engine and the agent skill: \`npx shadcn@latest add ${SITE.REGISTRY}/dithercn-skill.json\`. Then follow the skill (${base}${ROUTES.AGENT_SKILL}).
2. Write your own field on \`DitherShader\`: [Write your own dither](${base}${ROUTES.DOCS_WRITE_YOUR_OWN}.md). A field is a GLSL function that returns a tone from 0 to 1; any shape you can describe with math works.
3. Colour it from the theme: [Palettes](${base}/docs/engine/palettes.md). For many hues at once (a rainbow, a different colour per line), the "Any number of hues" section shows how.
4. Install an example only when it is what the user asked for. Otherwise read the closest one's source for technique and write your own.`;
