import { notFound } from "next/navigation";

import { getCatalog } from "@/lib/catalog";

/**
 * Development only: every catalog page URL, in catalog order, for
 * `scripts/capture-catalog.ts` to walk.
 */
export const GET = () => {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  return Response.json(
    getCatalog().flatMap((category) =>
      category.pieces.map((piece) => piece.url)
    )
  );
};
