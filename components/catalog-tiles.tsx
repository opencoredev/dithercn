import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { bayerMask } from "@/components/bayer-ramp";
import { Icon } from "@/components/icon";
import { ROUTES } from "@/constants/routes";
import type { CatalogCategory } from "@/lib/catalog";
import { BAYER_4 } from "@/lib/dither";
import { cn } from "@/lib/utils";

/**
 * Landing-page tiles, one per catalog group. Each tile's art is a small
 * static composition of Bayer levels that hints at what the group is for.
 * Site illustrations only, not registry pieces.
 */

const Dots = ({
  level,
  className,
  style,
}: {
  level: number;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div
    className={cn("absolute bg-current", className)}
    style={{ ...bayerMask(level), ...style }}
  />
);

// Fallback: the 4x4 matrix itself, each cell filled to its threshold.
const MatrixArt = () => (
  <div className="absolute inset-y-4 left-1/2 grid aspect-square -translate-x-1/2 grid-cols-4 gap-1">
    {Array.from(BAYER_4.ranks, (rank, index) => (
      <div key={index} className="relative">
        <Dots level={rank + 1} className="inset-0" />
      </div>
    ))}
  </div>
);

// Backgrounds: a glow spreading from one corner.
const GLOW_RINGS = [
  { level: 2, size: "190%" },
  { level: 5, size: "140%" },
  { level: 9, size: "95%" },
  { level: 14, size: "55%" },
] as const;

const GlowArt = () => (
  <>
    {GLOW_RINGS.map(({ level, size }) => (
      <Dots
        key={level}
        level={level}
        className="top-full left-full aspect-square -translate-1/2 rounded-full"
        style={{ height: size }}
      />
    ))}
  </>
);

// Charts: a bar chart.
const BAR_HEIGHTS = ["38%", "62%", "47%", "80%", "56%", "92%", "70%"] as const;

const BarsArt = () => (
  <div className="absolute inset-x-5 top-5 bottom-0 flex items-end gap-1.5">
    {BAR_HEIGHTS.map((height, index) => (
      <div key={height} className="relative flex-1" style={{ height }}>
        <Dots level={index === 5 ? 16 : 10} className="inset-0" />
      </div>
    ))}
  </div>
);

// Interface: a skeleton card.
const SkeletonArt = () => (
  <div className="absolute inset-x-5 top-1/2 flex -translate-y-1/2 items-start gap-3">
    <div className="relative size-10 shrink-0 rounded-full">
      <Dots level={8} className="inset-0 rounded-full" />
    </div>
    <div className="flex flex-1 flex-col gap-2 pt-0.5">
      <div className="relative h-3 w-3/4">
        <Dots level={12} className="inset-0" />
      </div>
      <div className="relative h-3 w-full">
        <Dots level={5} className="inset-0" />
      </div>
      <div className="relative h-3 w-5/12">
        <Dots level={5} className="inset-0" />
      </div>
    </div>
  </div>
);

// Text: one large glyph filled with dots.
const GlyphArt = () => (
  <span
    className="absolute inset-0 flex items-center justify-center text-[6.5rem] leading-none font-semibold tracking-tighter"
    style={bayerMask(11)}
  >
    Aa
  </span>
);

// Images: a landscape, the classic dither test picture.
const LandscapeArt = () => (
  <>
    <Dots level={1} className="inset-x-0 top-0 h-1/3" />
    <Dots level={2} className="inset-x-0 top-1/3 h-1/3" />
    <Dots level={4} className="inset-x-0 top-2/3 h-1/3" />
    <Dots level={13} className="top-[22%] right-[20%] size-9 rounded-full" />
    <Dots
      level={8}
      className="inset-x-0 bottom-0 h-3/5"
      style={{
        clipPath:
          "polygon(0 70%, 28% 18%, 46% 52%, 64% 6%, 100% 64%, 100% 100%, 0 100%)",
      }}
    />
    <Dots
      level={16}
      className="inset-x-0 bottom-0 h-1/4"
      style={{ clipPath: "ellipse(70% 100% at 30% 100%)" }}
    />
  </>
);

const ART = {
  backgrounds: GlowArt,
  charts: BarsArt,
  images: LandscapeArt,
  interface: SkeletonArt,
  text: GlyphArt,
} as const satisfies Record<string, () => React.ReactNode>;

const isArtKey = (id: string): id is keyof typeof ART => Object.hasOwn(ART, id);

const TileArt = ({ id }: { id: string }) => {
  const Art = isArtKey(id) ? ART[id] : MatrixArt;
  return <Art />;
};

const countLabel = (count: number) =>
  count === 1 ? "1 component" : `${count} components`;

const tileHref = (category: CatalogCategory) =>
  category.pieces[0]?.url ?? `${ROUTES.DOCS_CATALOG}#catalog-${category.id}`;

export const CatalogTiles = ({
  catalog,
  className,
}: {
  catalog: CatalogCategory[];
  className?: string;
}) => (
  <ul
    className={cn("grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3", className)}
  >
    {catalog.map((category) => (
      <li key={category.id} className="scroll-reveal flex">
        <Link
          href={tileHref(category)}
          transitionTypes={["nav-forward"]}
          className="group/tile bg-card focus-visible:ring-ring/60 flex flex-1 flex-col overflow-hidden rounded-[20px] outline-none focus-visible:ring-[3px]"
        >
          <div
            aria-hidden="true"
            className="text-dither-ink/65 group-hover/tile:text-dither-ink group-focus-visible/tile:text-dither-ink relative h-36 overflow-hidden transition-colors duration-300 ease-(--ease-out) sm:h-48"
          >
            {/* The art zooms inside the frame; the tile itself holds still. */}
            <div className="absolute inset-0 transition-transform duration-500 ease-(--ease-out) group-hover/tile:scale-[1.06] group-focus-visible/tile:scale-[1.06] motion-reduce:transition-none">
              <TileArt id={category.id} />
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-1.5 p-4 sm:p-5">
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              {countLabel(category.pieces.length)}
            </span>
            <span className="flex items-center justify-between gap-2">
              <span className="text-base font-medium tracking-[-0.01em] sm:text-lg">
                {category.name}
              </span>
              <Icon
                icon={ArrowRight01Icon}
                className="text-muted-foreground group-hover/tile:text-foreground size-4 shrink-0 transition-[color,translate] duration-300 ease-(--ease-out) group-hover/tile:translate-x-1 motion-reduce:transition-none"
              />
            </span>
            <span className="text-muted-foreground text-xs text-pretty sm:text-sm">
              {category.description}
            </span>
          </div>
        </Link>
      </li>
    ))}
  </ul>
);
