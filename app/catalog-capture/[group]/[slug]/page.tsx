import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogCaptureStage } from "@/components/catalog-capture-stage";
import { DOCS_DIR } from "@/lib/docs";
import { readOptionalFromRoot } from "@/lib/registry";

export const metadata: Metadata = { robots: { follow: false, index: false } };

// The first preview on a docs page is its demo, and its `align` sets how the
// demo sits on the stage.
const FIRST_PREVIEW = /<ComponentPreview\b([^>]*)>/u;
const SRC = /\bsrc="examples\/([\w-]+)\.tsx"/u;
const STRETCH = /\balign="stretch"/u;
const SEGMENT = /^[\w-]+$/u;

/**
 * Development-only page that renders one component's docs demo full-window.
 * `scripts/capture-catalog.ts` screenshots it for the catalog's tiles.
 */
const CatalogCapturePage = async (props: {
  params: Promise<{ group: string; slug: string }>;
}) => {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  const { group, slug } = await props.params;
  if (!(SEGMENT.test(group) && SEGMENT.test(slug))) {
    notFound();
  }

  const mdx = await readOptionalFromRoot(`${DOCS_DIR}/${group}/${slug}.mdx`);
  const attributes = mdx?.match(FIRST_PREVIEW)?.[1];
  const demo = attributes?.match(SRC)?.[1];
  if (!(attributes && demo)) {
    notFound();
  }

  return (
    <CatalogCaptureStage
      demo={demo}
      align={STRETCH.test(attributes) ? "stretch" : "center"}
    />
  );
};

export default CatalogCapturePage;
