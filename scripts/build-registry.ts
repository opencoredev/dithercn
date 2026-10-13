/**
 * Builds registry.json from registry/base.json plus one fragment per catalog
 * group (registry/<group>.json, each a JSON array of shadcn registry items),
 * then checks the result before `shadcn build` turns it into public/r.
 *
 * registry.json is generated and gitignored: edit the fragments instead.
 * `{{REGISTRY_URL}}` becomes `${SITE_URL ?? "http://localhost:3000"}/r`.
 *
 * Run with `pnpm registry:build`.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REGISTRY_DIR = path.join(ROOT, "registry");
const PLACEHOLDER = "{{REGISTRY_URL}}";
const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);
const REGISTRY_URL = `${SITE_URL}/r`;

// Site-only modules a shipped file must never import: users don't have them.
const FORBIDDEN_IMPORTS = [
  "@/constants",
  "@/components/icon",
  "@/hooks/",
  "@/examples/",
  "@hugeicons/",
] as const;

interface RegistryFile {
  path: string;
  type: string;
  target?: string;
}

interface RegistryItem {
  name: string;
  type: string;
  files?: RegistryFile[];
  registryDependencies?: string[];
  [key: string]: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFile = (value: unknown): value is RegistryFile =>
  isRecord(value) &&
  typeof value.path === "string" &&
  typeof value.type === "string";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const parseItem = (value: unknown, source: string): RegistryItem => {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    typeof value.type !== "string"
  ) {
    throw new Error(`${source}: every item needs a string "name" and "type"`);
  }
  const { files, registryDependencies } = value;
  if (
    files !== undefined &&
    !(Array.isArray(files) && files.every((file) => isFile(file)))
  ) {
    throw new Error(`${source}: "${value.name}" has malformed "files"`);
  }
  if (
    registryDependencies !== undefined &&
    !isStringArray(registryDependencies)
  ) {
    throw new Error(
      `${source}: "${value.name}" has malformed "registryDependencies"`
    );
  }
  return {
    ...value,
    files,
    name: value.name,
    registryDependencies,
    type: value.type,
  };
};

const readFragment = (file: string): RegistryItem[] => {
  const source = path.join("registry", file);
  const parsed: unknown = JSON.parse(
    readFileSync(path.join(REGISTRY_DIR, file), "utf-8")
  );
  if (!Array.isArray(parsed)) {
    throw new TypeError(`${source}: must be a JSON array of registry items`);
  }
  return parsed.map((item) => parseItem(item, source));
};

const fragments = readdirSync(REGISTRY_DIR)
  .filter((file) => file.endsWith(".json") && file !== "base.json")
  .toSorted();
const items = ["base.json", ...fragments].flatMap((file) =>
  readFragment(file).map((item) => ({ file, item }))
);

const errors: string[] = [];

const seen = new Map<string, string>();
for (const { file, item } of items) {
  const previous = seen.get(item.name);
  if (previous) {
    errors.push(
      `duplicate item "${item.name}" in registry/${previous} and registry/${file}`
    );
  }
  seen.set(item.name, file);
}

const IMPORT_PATTERN =
  /from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

for (const { file, item } of items) {
  const dependencies = new Set(item.registryDependencies);
  for (const entry of item.files ?? []) {
    let code: string;
    try {
      code = readFileSync(path.join(ROOT, entry.path), "utf-8");
    } catch {
      errors.push(
        `registry/${file}: "${item.name}" lists missing file ${entry.path}`
      );
      continue;
    }
    for (const match of code.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1] ?? match[2] ?? "";
      const where = `registry/${file}: "${item.name}" (${entry.path}) imports "${specifier}"`;
      if (FORBIDDEN_IMPORTS.some((prefix) => specifier.startsWith(prefix))) {
        errors.push(`${where}, a site-only module`);
      }
      const component = /^@\/components\/dithercn\/([^/]+)/.exec(
        specifier
      )?.[1];
      if (component && !dependencies.has(`${PLACEHOLDER}/${component}.json`)) {
        errors.push(
          `${where} without "${PLACEHOLDER}/${component}.json" in registryDependencies`
        );
      }
      if (
        specifier.startsWith("@/lib/dither") &&
        item.name !== "dither-core" &&
        !dependencies.has(`${PLACEHOLDER}/dither-core.json`)
      ) {
        errors.push(
          `${where} without "${PLACEHOLDER}/dither-core.json" in registryDependencies`
        );
      }
    }
  }
  for (const dependency of dependencies) {
    if (dependency.startsWith(PLACEHOLDER)) {
      const name = /\/([^/]+)\.json$/.exec(dependency)?.[1];
      if (!name || !seen.has(name)) {
        errors.push(
          `registry/${file}: "${item.name}" depends on "${dependency}", which no fragment defines`
        );
      }
    }
  }
}

const registry = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  homepage: SITE_URL,
  items: items.map(({ item }) => item),
  name: "dithercn",
};

const output = `${JSON.stringify(registry, null, 2).replaceAll(PLACEHOLDER, REGISTRY_URL)}\n`;
const leftover = /\{\{[A-Z_]+\}\}/.exec(output);
if (leftover) {
  errors.push(`unreplaced placeholder ${leftover[0]} in registry.json`);
}

if (errors.length > 0) {
  process.stderr.write(
    `registry:build failed:\n${errors.map((error) => `  - ${error}`).join("\n")}\n`
  );
  process.exit(1);
}

writeFileSync(path.join(ROOT, "registry.json"), output);
process.stdout.write(
  `registry.json: ${items.length} items from ${fragments.length + 1} files, URLs at ${REGISTRY_URL}\n`
);
