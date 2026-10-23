import { SITE } from "@/constants/site";
import { agentStartHere } from "@/lib/agent-discovery/agent-guide";
import { getAllPagesFromFolder } from "@/lib/page-tree";
import { getLLMText, isExamplePage, source } from "@/lib/source";

export const revalidate = false;

type DocsPage = ReturnType<typeof source.getPages>[number];

/**
 * Agents are often handed this file whole, so it reads in the order they
 * need: getting started, then the engine, then the examples. The sidebar
 * keeps its own order for people.
 */
const readingOrder = (page: DocsPage) => {
  const [section = ""] = page.slugs;
  if (section === "engine") {
    return 1;
  }
  if (isExamplePage(page)) {
    return 3;
  }
  return section === "examples" ? 2 : 0;
};

/** Page URLs in sidebar order, so pages within a section keep their order. */
const sidebarOrder = (): string[] =>
  source.pageTree.children.flatMap((node) => {
    if (node.type === "page") {
      return [node.url];
    }
    return node.type === "folder"
      ? getAllPagesFromFolder(node).map((page) => page.url)
      : [];
  });

export const GET = async () => {
  const sidebar = sidebarOrder();
  const position = (page: DocsPage) => {
    const index = sidebar.indexOf(page.url);
    return index === -1 ? sidebar.length : index;
  };
  const pages = source
    .getPages()
    .toSorted(
      (a, b) => readingOrder(a) - readingOrder(b) || position(a) - position(b)
    );
  const scanned = await Promise.all(
    pages.map((page) => getLLMText(page, "bundle"))
  );

  return new Response(
    [
      `# ${SITE.NAME}: full documentation\n\n> ${SITE.DESCRIPTION.LONG}`,
      agentStartHere(SITE.URL),
      ...scanned,
    ].join("\n\n")
  );
};
