import type { PreviewAlign } from "@/components/component-preview-frame";
import { DOCS_DIR } from "@/lib/docs";
import { readOptionalFromRoot } from "@/lib/registry";

// The first preview on a docs page is its demo, and its `align` sets how the
// demo sits on the stage.
const FIRST_PREVIEW = /<ComponentPreview\b([^>]*)>/u;
const SRC = /\bsrc="examples\/([\w-]+)\.tsx"/u;
const STRETCH = /\balign="stretch"/u;
const SEGMENT = /^[\w-]+$/u;

export interface DocsDemo {
  /** Demo file name under `examples/`, without the extension. */
  demo: string;
  align: PreviewAlign;
}

/** The demo a docs page opens with, or `null` if it has none. */
export const readDocsDemo = async (
  group: string,
  slug: string
): Promise<DocsDemo | null> => {
  if (!(SEGMENT.test(group) && SEGMENT.test(slug))) {
    return null;
  }
  const mdx = await readOptionalFromRoot(`${DOCS_DIR}/${group}/${slug}.mdx`);
  const attributes = mdx?.match(FIRST_PREVIEW)?.[1];
  const demo = attributes?.match(SRC)?.[1];
  if (!(attributes && demo)) {
    return null;
  }
  return { align: STRETCH.test(attributes) ? "stretch" : "center", demo };
};
