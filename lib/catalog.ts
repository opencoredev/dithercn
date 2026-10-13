import { GUIDE_FOLDER_IDS } from "@/lib/docs";
import { getPagesFromFolder } from "@/lib/page-tree";
import type { PageTreeFolder } from "@/lib/page-tree";
import { source } from "@/lib/source";

export interface CatalogPiece {
  name: string;
  url: string;
  description: string;
}

export interface CatalogCategory {
  id: string;
  name: string;
  description: string;
  pieces: CatalogPiece[];
}

const text = (node: React.ReactNode): string =>
  typeof node === "string" ? node : "";

const isCatalogFolder = (folder: PageTreeFolder) =>
  !GUIDE_FOLDER_IDS.includes(folder.$id ?? "");

/**
 * The catalog, derived from the docs page tree so content/docs stays the
 * single source of truth for what exists and in what order. A group with
 * no pages yet still appears, with an empty `pieces` list.
 */
export const getCatalog = (): CatalogCategory[] =>
  source.pageTree.children.flatMap((node) => {
    if (node.type !== "folder" || !isCatalogFolder(node)) {
      return [];
    }

    const pieces = getPagesFromFolder(node).flatMap((item) => {
      const page = source.getNodePage(item);
      if (!page) {
        return [];
      }
      return [
        {
          description: page.data.description ?? "",
          name: page.data.title,
          url: page.url,
        } satisfies CatalogPiece,
      ];
    });

    return [
      {
        description: text(node.description),
        id: node.$id ?? text(node.name),
        name: text(node.name),
        pieces,
      },
    ];
  });

export const countPieces = (catalog: CatalogCategory[]) =>
  catalog.reduce((sum, category) => sum + category.pieces.length, 0);
