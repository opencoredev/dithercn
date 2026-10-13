import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { BAYER_4, bayerMask } from "@/components/bayer-ramp";
import { Icon } from "@/components/icon";
import { ROUTES } from "@/constants/routes";
import type { CatalogCategory } from "@/lib/catalog";
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

// Foundations: the 4x4 matrix itself, each cell filled to its threshold.
const MatrixArt = () => (
  <div className="absolute inset-y-4 left-1/2 grid aspect-square -translate-x-1/2 grid-cols-4 gap-1">
    {BAYER_4.flatMap((row, y) =>
      row.map((threshold, x) => (
        <div key={`${x}-${y}`} className="relative">
          <Dots level={threshold + 1} className="inset-0" />
        </div>
      ))
    )}
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

// Dashboard: a bar chart, one bar per piece in the group.
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

// UI: a skeleton card.
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

// Type: one large glyph filled with dots.
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

// Logos: a wall of marks sharing one fill.
const LOGO_SHAPES = [
  "rounded-full",
  "rounded-[30%]",
  "[clip-path:polygon(50%_0,100%_100%,0_100%)]",
  "[clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)]",
  "rounded-t-full",
  "[clip-path:polygon(0_0,100%_0,100%_35%,35%_35%,35%_100%,0_100%)]",
] as const;

const LogoWallArt = () => (
  <div className="absolute inset-0 grid grid-cols-3 place-items-center gap-y-2 px-6 py-4">
    {LOGO_SHAPES.map((shape) => (
      <div key={shape} className="relative size-9">
        <Dots level={10} className={cn("inset-0", shape)} />
      </div>
    ))}
  </div>
);

// Tools: a diagonal ramp, the kind of test strip an export tool would print.
const DIAGONAL_LEVELS = [1, 3, 5, 7, 9, 11, 13, 15] as const;

const DiagonalArt = () => (
  <div className="absolute -inset-[60%] flex -rotate-30">
    {DIAGONAL_LEVELS.map((level) => (
      <div key={level} className="relative flex-1">
        <Dots level={level} className="inset-0" />
      </div>
    ))}
  </div>
);

const ART = {
  backgrounds: GlowArt,
  dashboard: BarsArt,
  foundations: MatrixArt,
  images: LandscapeArt,
  logos: LogoWallArt,
  tools: DiagonalArt,
  type: GlyphArt,
  ui: SkeletonArt,
} as const satisfies Record<string, () => React.ReactNode>;

const isArtKey = (id: string): id is keyof typeof ART => Object.hasOwn(ART, id);

const TileArt = ({ id }: { id: string }) => {
  const Art = isArtKey(id) ? ART[id] : MatrixArt;
  return <Art />;
};

const tileHref = (category: CatalogCategory) =>
  category.pieces[0]?.url ?? `${ROUTES.DOCS_CATALOG}#catalog-${category.id}`;

export const CatalogTiles = ({
  catalog,
  className,
}: {
  catalog: CatalogCategory[];
  className?: string;
}) => (
  <ul className={cn("grid grid-cols-2 gap-2 lg:grid-cols-4", className)}>
    {catalog.map((category) => (
      <li key={category.id} className="flex">
        <Link
          href={tileHref(category)}
          transitionTypes={["nav-forward"]}
          className="group/tile bg-card hover:border-primary/35 focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 flex-col overflow-hidden rounded-xl border transition-[border-color,box-shadow] duration-150 outline-none focus-visible:ring-[3px]"
        >
          <div
            aria-hidden="true"
            className="text-dither-ink/70 group-hover/tile:text-dither-ink group-focus-visible/tile:text-dither-ink relative h-28 overflow-hidden border-b border-dashed transition-colors duration-150 sm:h-36"
          >
            <TileArt id={category.id} />
          </div>
          <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
            <span className="text-muted-foreground font-mono text-xs tabular-nums">
              ({category.pieces.length}) planned
            </span>
            <span className="flex items-center justify-between gap-2">
              <span className="font-semibold tracking-tight">
                {category.name}
              </span>
              <Icon
                icon={ArrowRight01Icon}
                className="text-muted-foreground group-hover/tile:text-foreground size-4 shrink-0 transition-[color,translate] duration-150 group-hover/tile:translate-x-0.5"
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
