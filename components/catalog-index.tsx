import { existsSync } from "node:fs";
import path from "node:path";

import Image from "next/image";
import Link from "next/link";

import { getCatalog } from "@/lib/catalog";
import type { CatalogPiece } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/*
 * Direction: a contact sheet. Every component is a small print of its docs
 * demo on the same #141414 plate the docs stage uses, two to a row, name
 * underneath in plain text, group headings with a mono count. The dither is
 * the only colour on the page. Avoiding: card chrome, badges, descriptions
 * under every tile, and hover motion.
 *
 * The prints are screenshots in both site themes, made by
 * `pnpm catalog:capture` (scripts/capture-catalog.ts) and swapped by the
 * `dark` class, so 52 demos cost no WebGL contexts here.
 */

const THEMES = ["dark", "light"] as const;
type Theme = (typeof THEMES)[number];

/** Matches the capture size in scripts/capture-catalog.ts. */
const PREVIEW_WIDTH = 660;
const PREVIEW_HEIGHT = 496;

const previewSrc = (piece: CatalogPiece, theme: Theme) =>
  `/catalog${piece.url.replace(/^\/docs/u, "")}-${theme}.webp`;

const hasPreview = (piece: CatalogPiece) =>
  THEMES.every((theme) =>
    existsSync(path.join(process.cwd(), "public", previewSrc(piece, theme)))
  );

const THEME_CLASS = {
  dark: "hidden dark:block",
  light: "dark:hidden",
} as const satisfies Record<Theme, string>;

/** Tiles in the first two rows sit above the fold on a laptop. */
const EAGER_TILES = 6;

const PieceTile = ({
  piece,
  isEager,
}: {
  piece: CatalogPiece;
  isEager: boolean;
}) => (
  <li>
    <Link
      href={piece.url}
      transitionTypes={["nav-forward"]}
      className="group/tile focus-visible:ring-ring/50 flex flex-col gap-2.5 rounded-[18px] outline-none focus-visible:ring-[3px] focus-visible:ring-offset-4 focus-visible:ring-offset-background"
    >
      <span className="bg-card relative block aspect-[4/3] overflow-hidden rounded-[14px] sm:rounded-[18px]">
        {hasPreview(piece)
          ? THEMES.map((theme) => (
              <Image
                key={theme}
                src={previewSrc(piece, theme)}
                alt=""
                width={PREVIEW_WIDTH}
                height={PREVIEW_HEIGHT}
                unoptimized
                loading={isEager ? "eager" : "lazy"}
                className={cn("size-full object-cover", THEME_CLASS[theme])}
              />
            ))
          : null}
      </span>
      <span className="decoration-foreground/40 px-0.5 text-sm font-medium underline-offset-4 group-hover/tile:underline">
        {piece.name}
      </span>
    </Link>
  </li>
);

export const CatalogIndex = ({ className }: { className?: string }) => {
  const catalog = getCatalog();

  return (
    <div className={cn("flex flex-col gap-14", className)}>
      {catalog.map((category, groupIndex) => {
        const isFirstGroup = groupIndex === 0;
        return (
          <section
            key={category.id}
            aria-labelledby={`catalog-${category.id}`}
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-4">
                <h3
                  id={`catalog-${category.id}`}
                  className="scroll-m-28 text-base font-semibold tracking-tight"
                >
                  {category.name}
                </h3>
                <span className="text-muted-foreground font-mono text-xs tabular-nums">
                  {category.pieces.length}
                </span>
              </div>
              <p className="text-muted-foreground text-sm text-pretty">
                {category.description}
              </p>
            </div>
            {category.pieces.length > 0 ? (
              <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
                {category.pieces.map((piece, index) => (
                  <PieceTile
                    key={piece.url}
                    piece={piece}
                    isEager={isFirstGroup && index < EAGER_TILES}
                  />
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
};
