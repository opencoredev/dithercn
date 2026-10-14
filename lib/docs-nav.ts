import type { Root as PageTreeRoot } from "fumadocs-core/page-tree";

import { EXAMPLES_FOLDER_ID, GUIDE_FOLDER_IDS } from "@/lib/docs";
import { getPagesFromFolder } from "@/lib/page-tree";
import type { PageTreePage } from "@/lib/page-tree";

export interface DocsNavCategory {
  id: string;
  name: React.ReactNode;
  pages: PageTreePage[];
}

export interface DocsNavSection {
  id: string;
  label: React.ReactNode;
  pages: PageTreePage[];
  /** Catalog groups, listed under the Examples section after its own pages. */
  categories: DocsNavCategory[];
}

/**
 * The docs navigation shared by the sidebar and the mobile menu. Guide
 * folders become sections in page-tree order, and every catalog folder is
 * filed under the Examples section so the sidebar reads as three parts:
 * Get started, Examples and Engine.
 */
export const getDocsNav = (tree: PageTreeRoot): DocsNavSection[] => {
  const folders = tree.children.flatMap((node) =>
    node.type === "folder" ? [node] : []
  );

  const categories = folders.flatMap((folder) =>
    GUIDE_FOLDER_IDS.includes(folder.$id ?? "")
      ? []
      : [
          {
            id: folder.$id ?? "",
            name: folder.name,
            pages: getPagesFromFolder(folder),
          } satisfies DocsNavCategory,
        ]
  );

  return folders.flatMap((folder) => {
    const id = folder.$id ?? "";
    if (!GUIDE_FOLDER_IDS.includes(id)) {
      return [];
    }
    return [
      {
        categories: id === EXAMPLES_FOLDER_ID ? categories : [],
        id,
        label: folder.name,
        pages: getPagesFromFolder(folder),
      } satisfies DocsNavSection,
    ];
  });
};
