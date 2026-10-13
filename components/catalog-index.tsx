import Link from "next/link";

import { getCatalog } from "@/lib/catalog";
import type { CatalogPiece } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const PieceLink = ({
  piece,
  isFull,
}: {
  piece: CatalogPiece;
  isFull: boolean;
}) => (
  <li>
    <Link
      href={piece.url}
      transitionTypes={["nav-forward"]}
      className="group/piece focus-visible:ring-ring/50 -mx-2 flex flex-col gap-0.5 rounded-md px-2 py-1.5 outline-none focus-visible:ring-[3px]"
    >
      <span className="flex items-baseline gap-2">
        <span className="decoration-primary/40 group-hover/piece:decoration-primary font-medium underline decoration-1 underline-offset-4 transition-colors">
          {piece.name}
        </span>
        {isFull && piece.status === "planned" && (
          <span className="text-muted-foreground font-mono text-[0.7rem]">
            soon
          </span>
        )}
      </span>
      {isFull && piece.description && (
        <span className="text-muted-foreground text-sm text-pretty">
          {piece.description}
        </span>
      )}
    </Link>
  </li>
);

export const CatalogIndex = ({
  variant = "full",
  className,
}: {
  variant?: "compact" | "full";
  className?: string;
}) => {
  const catalog = getCatalog();
  const isFull = variant === "full";

  return (
    <div className={cn("flex flex-col", className)}>
      {catalog.map((category) => (
        <section
          key={category.id}
          aria-labelledby={`catalog-${category.id}`}
          className="grid gap-x-10 gap-y-3 border-t py-6 first:border-t-0 first:pt-0 md:grid-cols-[13rem_minmax(0,1fr)]"
        >
          <div className="flex flex-col gap-1">
            <h3
              id={`catalog-${category.id}`}
              className="text-base font-semibold tracking-tight"
            >
              {category.name}
            </h3>
            <p className="text-muted-foreground text-sm text-pretty">
              {category.description}
            </p>
          </div>
          <ul
            className={cn(
              "grid gap-x-8",
              isFull ? "gap-y-2 sm:grid-cols-2" : "gap-y-0.5 sm:grid-cols-3"
            )}
          >
            {category.pieces.map((piece) => (
              <PieceLink key={piece.url} piece={piece} isFull={isFull} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
