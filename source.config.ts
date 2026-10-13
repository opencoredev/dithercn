import {
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema,
} from "fumadocs-mdx/config";
import { rehypePrettyCode } from "rehype-pretty-code";
import { z } from "zod";

import { DOCS_DIR } from "@/lib/docs";
import { transformers } from "@/lib/highlight-code";
import { dithercnDark, dithercnLight } from "@/lib/shiki-themes";

export default defineConfig({
  mdxOptions: {
    rehypePlugins: (plugins) => {
      plugins.shift();
      plugins.push([
        rehypePrettyCode,
        {
          theme: {
            dark: dithercnDark,
            light: dithercnLight,
          },
          transformers,
        },
      ]);

      return plugins;
    },
  },
});

export const docs = defineDocs({
  dir: DOCS_DIR,
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
    schema: frontmatterSchema.extend({
      /** Catalog pieces only. Guide pages leave this unset. */
      status: z.enum(["planned", "available"]).optional(),
    }),
  },
  meta: {
    schema: metaSchema,
  },
});
