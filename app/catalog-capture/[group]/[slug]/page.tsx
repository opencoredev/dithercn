import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogCaptureStage } from "@/components/catalog-capture-stage";
import { readDocsDemo } from "@/lib/docs-demo";

export const metadata: Metadata = { robots: { follow: false, index: false } };

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
  const docsDemo = await readDocsDemo(group, slug);
  if (!docsDemo) {
    notFound();
  }

  return <CatalogCaptureStage demo={docsDemo.demo} align={docsDemo.align} />;
};

export default CatalogCapturePage;
