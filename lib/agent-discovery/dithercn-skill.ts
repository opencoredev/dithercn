import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * The dithercn agent skill: `skills/dithercn/` in this repo, rendered for one
 * site origin. The source uses `{{SITE_URL}}` and `{{REGISTRY_URL}}`;
 * `references/examples.md` is generated from the registry fragments so the
 * list of examples never drifts from what installs.
 *
 * Served at /.well-known/agent-skills/dithercn/ and written by
 * `pnpm registry:build` for the `dithercn-skill` registry item. No `@/`
 * imports: scripts/build-registry.ts loads this file with jiti.
 */

export const SKILL_NAME = "dithercn";

export const SKILL_DESCRIPTION =
  "Build any dithered visual with the dithercn engine: backgrounds, charts, meters, cards, text and images for landing pages and dashboards.";

const ROOT = process.cwd();
const SKILL_DIR = path.join(ROOT, "skills", SKILL_NAME);
const REGISTRY_DIR = path.join(ROOT, "registry");
const DOCS_DIR = path.join(ROOT, "content", "docs");

const EXAMPLES_FILE = "references/examples.md";

/** Example groups in docs order, keyed by the start of their fragment's name. */
const GROUPS = [
  { id: "backgrounds", title: "Backgrounds" },
  { id: "charts", title: "Charts" },
  { id: "interface", title: "Interface" },
  { id: "text", title: "Text" },
  { id: "images", title: "Images" },
] as const;

interface FragmentItem {
  readonly name: string;
  readonly type: string;
  readonly title?: string;
  readonly description?: string;
}

const isFragmentItem = (value: unknown): value is FragmentItem =>
  typeof value === "object" &&
  value !== null &&
  "name" in value &&
  typeof value.name === "string" &&
  "type" in value &&
  typeof value.type === "string";

const readFragment = (file: string): FragmentItem[] => {
  const parsed: unknown = JSON.parse(
    readFileSync(path.join(REGISTRY_DIR, file), "utf-8")
  );
  return Array.isArray(parsed) ? parsed.filter(isFragmentItem) : [];
};

const sourceFiles = (): string[] => {
  const references = readdirSync(path.join(SKILL_DIR, "references"))
    .filter((file) => file.endsWith(".md"))
    .map((file) => `references/${file}`);
  return ["SKILL.md", ...references].filter((file) => file !== EXAMPLES_FILE);
};

/** Every file of the skill, relative to its folder, `SKILL.md` first. */
export const skillFiles = (): string[] =>
  [...sourceFiles(), EXAMPLES_FILE].toSorted((a, b) => {
    if (a === "SKILL.md") {
      return -1;
    }
    return b === "SKILL.md" ? 1 : a.localeCompare(b);
  });

const examplesMarkdown = (): string => {
  const fragments = readdirSync(REGISTRY_DIR).filter((file) =>
    file.endsWith(".json")
  );
  const sections = GROUPS.flatMap((group) => {
    const items = fragments
      .filter((file) => file.startsWith(group.id))
      .toSorted()
      .flatMap(readFragment)
      .filter((item) => item.type === "registry:component")
      .toSorted((a, b) => a.name.localeCompare(b.name));
    if (items.length === 0) {
      return [];
    }
    const rows = items.map((item) => {
      const page = existsSync(path.join(DOCS_DIR, group.id, `${item.name}.mdx`))
        ? ` Docs: {{SITE_URL}}/docs/${group.id}/${item.name}.md`
        : "";
      return `- \`${item.name}\`: ${item.description ?? item.title ?? ""}${page}`;
    });
    return [`## ${group.title}\n\n${rows.join("\n")}`];
  });

  return `# Examples

Components built on the engine. Each installs as plain source into \`components/dithercn/<name>.tsx\`, so you can read it, copy its field or SVG, or edit it in place. Install one with:

\`\`\`bash
npx shadcn@latest add {{REGISTRY_URL}}/<name>.json
\`\`\`

Each docs page (the \`.md\` link) has usage, every prop and in-context examples. Read the installed source for the field and the technique.

${sections.join("\n\n")}
`;
};

const render = (markdown: string, origin: string) => {
  const site = origin.replace(/\/$/, "");
  return markdown
    .replaceAll("{{REGISTRY_URL}}", `${site}/r`)
    .replaceAll("{{SITE_URL}}", site);
};

/** One skill file rendered for `origin`, or `null` if the skill has no such file. */
export const renderSkillFile = (
  file: string,
  origin: string
): string | null => {
  if (file === EXAMPLES_FILE) {
    return render(examplesMarkdown(), origin);
  }
  if (!sourceFiles().includes(file)) {
    return null;
  }
  return render(readFileSync(path.join(SKILL_DIR, file), "utf-8"), origin);
};

/** `sha256:<hex>` of the rendered SKILL.md, for the discovery index. */
export const skillDigest = (origin: string): string => {
  const skill = renderSkillFile("SKILL.md", origin) ?? "";
  return `sha256:${createHash("sha256").update(skill, "utf-8").digest("hex")}`;
};
