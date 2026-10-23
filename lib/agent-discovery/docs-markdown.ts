import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";
import { AGENT_PROMPTS } from "@/lib/agent-prompts";
import { readOptionalFromRoot } from "@/lib/registry";
import { registryItemUrl } from "@/lib/registry-items";

/**
 * The Markdown mirror of a docs page keeps MDX components as raw JSX. An agent
 * reading `<InstallBlock name="waves" />` learns nothing, so each component
 * that carries code, a command or a prompt becomes that code, command or
 * prompt, and layout-only wrappers go away.
 *
 * `"page"` is one page's `.md`: live previews become their example source.
 * `"bundle"` is llms-full.txt, read whole: previews on example pages are
 * dropped so the engine guides aren't buried under demo code.
 */
export type MarkdownTarget = "page" | "bundle";

// JSX attributes, where a quoted value may itself contain `>`.
const ATTRS = String.raw`(?:[^>"']|"[^"]*"|'[^']*')*`;
const PREVIEW = new RegExp(
  String.raw`<ComponentPreview\b${ATTRS}?\bsrc=["']([^"']+)["']${ATTRS}>[\s\S]*?<\/ComponentPreview>`,
  "g"
);
const INSTALL_BLOCK = /<InstallBlock\s+name=["']([^"']+)["']\s*\/>/g;
const AGENT_PROMPT = /<AgentPrompt\s+name=["']([^"']+)["']\s*\/>/g;
const COMMAND_BOX = new RegExp(
  String.raw`<CommandBox\b${ATTRS}?\btool=["']skills["']${ATTRS}\/>`,
  "g"
);
const CATALOG_INDEX = new RegExp(String.raw`<CatalogIndex\b${ATTRS}\/>`, "g");
// A fenced code block, which may itself show these components as examples.
const FENCED = /^[ \t]*(`{3,}|~{3,})[\s\S]*?^[ \t]*\1[ \t]*$/gm;
const STEPS = /^[ \t]*<\/?Steps>[ \t]*\n/gm;

const fence = (language: string, body: string, title?: string) =>
  `\`\`\`${language}${title ? ` title="${title}"` : ""}\n${body.trimEnd()}\n\`\`\``;

const installCommand = (name: string) =>
  fence("bash", `npx shadcn@latest add ${registryItemUrl(name)}`);

const isPromptName = (name: string): name is keyof typeof AGENT_PROMPTS =>
  Object.hasOwn(AGENT_PROMPTS, name);

const agentPrompt = (name: string) =>
  isPromptName(name) ? fence("text", AGENT_PROMPTS[name]()) : "";

/** `String.replace` with an async replacer, run over every match in order. */
const replaceAsync = async (
  text: string,
  pattern: RegExp,
  replace: (match: RegExpMatchArray) => Promise<string>
) => {
  const matches = [...text.matchAll(pattern)];
  const replacements = await Promise.all(matches.map(replace));
  let out = "";
  let last = 0;
  for (const [index, match] of matches.entries()) {
    out += text.slice(last, match.index) + replacements[index];
    last = (match.index ?? 0) + match[0].length;
  }
  return out + text.slice(last);
};

// Knob demos read the docs' preview rail and shared helpers, which don't
// exist in a user's project. An agent copying one would import them anyway.
const DOCS_ONLY_IMPORT = /from "@\/(?:components\/preview-controls|examples\/)/;

const previewSource = async ([, src = ""]: RegExpMatchArray) => {
  const code = await readOptionalFromRoot(src);
  return code === null || DOCS_ONLY_IMPORT.test(code)
    ? ""
    : fence("tsx", code, src);
};

/** Apply `transform` to the text between fenced code blocks only. */
const outsideCode = async (
  markdown: string,
  transform: (prose: string) => Promise<string>
) => {
  const parts: Promise<string>[] = [];
  let last = 0;
  for (const match of markdown.matchAll(FENCED)) {
    parts.push(transform(markdown.slice(last, match.index)));
    parts.push(Promise.resolve(match[0]));
    last = match.index + match[0].length;
  }
  parts.push(transform(markdown.slice(last)));
  const done = await Promise.all(parts);
  return done.join("");
};

const expandProse = async ({
  prose,
  target,
  isExample,
}: {
  prose: string;
  target: MarkdownTarget;
  isExample: boolean;
}) => {
  const plain = prose
    .replaceAll(INSTALL_BLOCK, (_, name: string) => installCommand(name))
    .replaceAll(AGENT_PROMPT, (_, name: string) => agentPrompt(name))
    .replaceAll(COMMAND_BOX, () => fence("bash", `npx skills add ${SITE.URL}`))
    .replaceAll(
      CATALOG_INDEX,
      () =>
        `Every example, with its install command and docs link, is listed in [llms.txt](${ROUTES.LLMS}) and in the skill's [references/examples.md](/.well-known/agent-skills/dithercn/references/examples.md).`
    )
    .replaceAll(STEPS, "");

  return target === "bundle" && isExample
    ? plain.replaceAll(PREVIEW, "")
    : await replaceAsync(plain, PREVIEW, previewSource);
};

/** Turn the docs' MDX components into plain Markdown an agent can act on. */
export const expandDocsComponents = async ({
  markdown,
  target,
  isExample,
}: {
  markdown: string;
  target: MarkdownTarget;
  isExample: boolean;
}): Promise<string> => {
  const expanded = await outsideCode(markdown, (prose) =>
    expandProse({ isExample, prose, target })
  );
  // Dropped components leave runs of blank lines behind.
  return expanded.replaceAll(/\n{3,}/g, "\n\n");
};

/**
 * Said at the top of every example page's Markdown: the page documents one
 * component, and an agent asked for something else should build it rather
 * than bend this one's props to fit.
 */
export const exampleNotice = (name: string | null) => {
  const source = name
    ? ` Its full source is in [${registryItemUrl(name)}](${registryItemUrl(name)}), under \`files[].content\`.`
    : "";
  return `> **This is an example, not the only option.** It is one component built on the dithercn engine. Install it when it is what you were asked for. For any other look, don't stretch its props to fit: write your own field on \`DitherShader\` ([Write your own dither](${ROUTES.DOCS_WRITE_YOUR_OWN}.md)), and read this example's source for technique.${source}`;
};

/** The registry item an example page installs, from its first `<InstallBlock>` outside code. */
export const installedItem = (markdown: string): string | null =>
  [...markdown.replaceAll(FENCED, "").matchAll(INSTALL_BLOCK)][0]?.[1] ?? null;
