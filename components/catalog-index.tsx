import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { CatalogLivePreview } from "@/components/catalog-live-preview";
import { getCatalog } from "@/lib/catalog";
import type { CatalogPiece } from "@/lib/catalog";
import {
  hasPreview,
  PREVIEW_HEIGHT,
  PREVIEW_THEMES,
  PREVIEW_WIDTH,
  previewSrc,
} from "@/lib/catalog-preview";
import type { PreviewTheme } from "@/lib/catalog-preview";
import { readDocsDemo } from "@/lib/docs-demo";
import { readOptionalFromRoot } from "@/lib/registry";
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
 * `dark` class. Backgrounds also play their demo live over the print once
 * they near the viewport, within the engine's WebGL context budget.
 */

/** Groups whose demos move on their own, so their tiles play live. */
const LIVE_GROUPS: ReadonlySet<string> = new Set(["backgrounds"]);

const liveDemo = async (piece: CatalogPiece) => {
  const [group, slug] = piece.url.replace(/^\/docs\//u, "").split("/");
  if (!(group && slug && LIVE_GROUPS.has(group))) {
    return null;
  }
  const docsDemo = await readDocsDemo(group, slug);
  if (docsDemo?.align !== "stretch") {
    return null;
  }
  // The print stays under the live layer, so only a shader, which paints
  // every cell, may cover it. SVG and canvas demos such as the dot map and
  // the globe would draw on top of their own screenshot.
  const source = await readOptionalFromRoot(`components/dithercn/${slug}.tsx`);
  return source?.includes("<DitherShader") ? docsDemo.demo : null;
};

const THEME_CLASS = {
  dark: "hidden dark:block",
  light: "dark:hidden",
} as const satisfies Record<PreviewTheme, string>;

/** Tiles in the first two rows sit above the fold on a laptop. */
const EAGER_TILES = 6;

/*
 * Only the active theme's image may download. A lazy <img> hidden by
 * `display: none` is never fetched, but an eager one always is, so the
 * above-the-fold tiles draw their preview as a CSS background instead: the
 * browser fetches a background only when its rule applies, and the rule
 * follows the `dark` class, which a <picture> media query can't. Forced
 * colors mode drops background images, so this one opts out to keep the
 * preview, as an <img> would.
 */
const EagerPreview = ({ piece }: { piece: CatalogPiece }) => (
  <span
    className="absolute inset-0 bg-(image:--preview-light) bg-cover bg-center forced-color-adjust-none dark:bg-(image:--preview-dark)"
    style={
      {
        "--preview-dark": `url("${previewSrc(piece.url, "dark")}")`,
        "--preview-light": `url("${previewSrc(piece.url, "light")}")`,
      } as CSSProperties
    }
  />
);

const LazyPreview = ({ piece }: { piece: CatalogPiece }) =>
  PREVIEW_THEMES.map((theme) => (
    <Image
      key={theme}
      src={previewSrc(piece.url, theme)}
      alt=""
      width={PREVIEW_WIDTH}
      height={PREVIEW_HEIGHT}
      unoptimized
      loading="lazy"
      className={cn("size-full object-cover", THEME_CLASS[theme])}
    />
  ));

const PieceTile = ({
  piece,
  isEager,
  demo,
}: {
  piece: CatalogPiece;
  isEager: boolean;
  /** Set for tiles that play live over their screenshot. */
  demo: string | null;
}) => {
  const Preview = isEager ? EagerPreview : LazyPreview;
  return (
    <li>
      <Link
        href={piece.url}
        transitionTypes={["nav-forward"]}
        data-track="example_card_clicked"
        data-track-component-name={piece.url.split("/").pop()}
        data-track-category={piece.url.split("/")[2]}
        data-track-location="catalog"
        className="group/tile focus-visible:ring-ring/50 flex flex-col gap-2.5 rounded-[18px] outline-none focus-visible:ring-[3px] focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      >
        <span className="bg-card relative block aspect-[4/3] overflow-hidden rounded-[14px] sm:rounded-[18px]">
          {hasPreview(piece.url) ? <Preview piece={piece} /> : null}
          {demo ? <CatalogLivePreview demo={demo} /> : null}
        </span>
        <span className="decoration-foreground/40 px-0.5 text-sm font-medium underline-offset-4 group-hover/tile:underline">
          {piece.name}
        </span>
      </Link>
    </li>
  );
};

export const CatalogIndex = async ({ className }: { className?: string }) => {
  const catalog = getCatalog();
  const demos = new Map(
    await Promise.all(
      catalog
        .flatMap((category) => category.pieces)
        .map(async (piece) => [piece.url, await liveDemo(piece)] as const)
    )
  );

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
                    demo={demos.get(piece.url) ?? null}
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
