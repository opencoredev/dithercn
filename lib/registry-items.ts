import { promises as fs } from "node:fs";
import path from "node:path";

import { z } from "zod";

import { SITE } from "@/constants/site";

/**
 * Reads registry items straight from the source fragments
 * (registry/base.json and registry/<group>.json), so docs pages never
 * depend on the generated registry.json.
 */

const itemSchema = z.object({
  dependencies: z.array(z.string()).optional(),
  description: z.string().optional(),
  files: z
    .array(
      z.object({
        path: z.string(),
        target: z.string().optional(),
        type: z.string(),
      })
    )
    .optional(),
  name: z.string(),
  registryDependencies: z.array(z.string()).optional(),
  title: z.string().optional(),
  type: z.string(),
});

export type RegistryItem = z.infer<typeof itemSchema>;

const fragmentSchema = z.array(itemSchema);
const PLACEHOLDER = "{{REGISTRY_URL}}";
const REGISTRY_DIR = path.join(process.cwd(), "registry");

const readItems = async (): Promise<RegistryItem[]> => {
  const entries = await fs.readdir(REGISTRY_DIR);
  const files = entries.filter((file) => file.endsWith(".json"));
  const fragments = await Promise.all(
    files.map(async (file) =>
      fragmentSchema.parse(
        JSON.parse(await fs.readFile(path.join(REGISTRY_DIR, file), "utf-8"))
      )
    )
  );
  return fragments.flat();
};

/** The item's public URL, as `shadcn add` takes it. */
export const registryItemUrl = (name: string) =>
  `${SITE.REGISTRY}/${name}.json`;

/** Replace `{{REGISTRY_URL}}` with this site's registry URL. */
export const resolveRegistryUrl = (value: string) =>
  value.replaceAll(PLACEHOLDER, SITE.REGISTRY);

export const getRegistryItem = async (
  name: string
): Promise<RegistryItem | null> => {
  const items = await readItems();
  return items.find((item) => item.name === name) ?? null;
};
