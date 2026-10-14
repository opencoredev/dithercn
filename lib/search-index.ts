import { hasPreview, previewSrc } from "@/lib/catalog-preview";
import { getPagesFromFolder } from "@/lib/page-tree";
import { source } from "@/lib/source";

export interface SearchEntry {
  name: string;
  url: string;
  description: string;
  /** Catalog screenshots, for components that have them. */
  preview: { dark: string; light: string } | null;
}

export interface SearchGroup {
  /** The docs folder id, such as `backgrounds` or `engine`. */
  id: string;
  label: string;
  entries: SearchEntry[];
}

/**
 * Every docs page for the search dialog, grouped as in the sidebar, with
 * its description and, for catalog pieces, its screenshots. Built on the
 * server so the dialog can show previews without reading the filesystem.
 */
export const getSearchGroups = (): SearchGroup[] =>
  source.pageTree.children.flatMap((node) => {
    if (node.type !== "folder") {
      return [];
    }
    const entries = getPagesFromFolder(node).flatMap((item) => {
      const page = source.getNodePage(item);
      if (!page) {
        return [];
      }
      return [
        {
          description: page.data.description ?? "",
          name: page.data.title,
          preview: hasPreview(page.url)
            ? {
                dark: previewSrc(page.url, "dark"),
                light: previewSrc(page.url, "light"),
              }
            : null,
          url: page.url,
        } satisfies SearchEntry,
      ];
    });
    const label = typeof node.name === "string" ? node.name : "";
    return entries.length > 0
      ? [{ entries, id: node.$id ?? label, label }]
      : [];
  });
