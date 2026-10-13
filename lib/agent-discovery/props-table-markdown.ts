/**
 * The Markdown mirror of a docs page keeps MDX components as raw JSX, so a
 * `<PropsTable rows={[…]} />` arrives as an attribute string full of HTML
 * entities. Agents read these pages, so each one becomes a Markdown table.
 */

const PROPS_TABLE = /<PropsTable\s+rows="([\s\S]*?)"\s*\/>/g;
const FIELD = /(\w+):\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|true|false)/g;

const ENTITIES: Record<string, string> = {
  "&#x22;": '"',
  "&#x27;": "'",
  "&#x3C;": "<",
  "&#x3E;": ">",
  "&amp;": "&",
  "&gt;": ">",
  "&lt;": "<",
  "&quot;": '"',
};

const decode = (value: string) =>
  value.replaceAll(
    /&#x2[27];|&#x3[CE];|&(?:amp|gt|lt|quot);/g,
    (entity) => ENTITIES[entity] ?? entity
  );

const literal = (raw: string): string => {
  if (raw === "true" || raw === "false") {
    return raw;
  }
  const body = raw.slice(1, -1);
  return body.replaceAll(/\\(.)/g, "$1");
};

/** The bodies of the top-level `{ … }` objects, skipping braces inside strings. */
const objectBodies = (source: string): string[] => {
  const bodies: string[] = [];
  let depth = 0;
  let start = -1;
  let quote = "";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote !== "") {
      if (char === "\\") {
        index += 1;
      } else if (char === quote) {
        quote = "";
      }
    } else if (char === '"' || char === "'" || char === "`") {
      quote = char;
    } else if (char === "{") {
      depth += 1;
      if (depth === 2) {
        start = index + 1;
      }
    } else if (char === "}") {
      if (depth === 2) {
        bodies.push(source.slice(start, index));
      }
      depth -= 1;
    }
  }
  return bodies;
};

const cell = (value: string) => value.replaceAll("|", "\\|").trim();

const toTable = (rows: string) => {
  const lines = objectBodies(`{${decode(rows)}}`).map((body) => {
    const fields = new Map(
      [...body.matchAll(FIELD)].map(([, key = "", raw = ""]) => [
        key,
        literal(raw),
      ])
    );
    const name = fields.get("name") ?? "";
    const required = fields.get("required") === "true" ? " (required)" : "";
    const type = fields.get("type") ?? "";
    const fallback = fields.get("default") ?? "";
    return `| \`${cell(name)}\`${required} | \`${cell(type)}\` | ${fallback ? `\`${cell(fallback)}\`` : ""} | ${cell(fields.get("description") ?? "")} |`;
  });
  return [
    "| Prop | Type | Default | Description |",
    "| --- | --- | --- | --- |",
    ...lines,
  ].join("\n");
};

/** Replace every `<PropsTable … />` in processed Markdown with a table. */
export const propsTablesToMarkdown = (markdown: string): string =>
  markdown.replaceAll(PROPS_TABLE, (_, rows: string) => toTable(rows));
