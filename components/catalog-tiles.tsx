"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { BarChart } from "@/components/dithercn/bar-chart";
import { DitherImage } from "@/components/dithercn/dither-image";
import { DitherText } from "@/components/dithercn/dither-text";
import { Eclipse } from "@/components/dithercn/eclipse";
import { ProgressBar } from "@/components/dithercn/progress-bar";
import { Icon } from "@/components/icon";
import { ROUTES } from "@/constants/routes";
import type { CatalogCategory } from "@/lib/catalog";
import { ditherMaskStyle } from "@/lib/dither";
import { cn } from "@/lib/utils";

/**
 * Landing bento, one tile per catalog group. Each tile's art is a real
 * component from that group, rendered still and non-interactive, so what
 * you see is what installs. Only the Backgrounds tile uses WebGL.
 */

const DEPLOYS = [
  { deploys: 38, week: "W27" },
  { deploys: 44, week: "W28" },
  { deploys: 41, week: "W29" },
  { deploys: 52, week: "W30" },
  { deploys: 47, week: "W31" },
  { deploys: 58, week: "W32" },
  { deploys: 55, week: "W33" },
  { deploys: 63, week: "W34" },
  { deploys: 49, week: "W35" },
  { deploys: 61, week: "W36" },
  { deploys: 68, week: "W37" },
  { deploys: 74, week: "W38" },
] as const;

const BackgroundsArt = () => (
  <Eclipse
    center={[0.62, 0.44]}
    size={0.3}
    corona={0.7}
    className="absolute inset-0"
  />
);

const ChartsArt = () => (
  <div className="absolute inset-x-5 top-6 bottom-0 sm:inset-x-6">
    <BarChart
      data={DEPLOYS}
      x="week"
      series={[{ label: "Deploys", value: "deploys" }]}
      height={170}
      axes={false}
      interactive={false}
      animate={false}
    />
  </div>
);

const InterfaceArt = () => (
  <div className="absolute inset-x-5 top-1/2 flex -translate-y-1/2 flex-col gap-5 sm:inset-x-6">
    <ProgressBar
      label="Storage"
      value={72}
      valueText="7.2 of 10 GB"
      animate={false}
    />
    <ProgressBar
      label="Build minutes"
      value={38}
      valueText="2,280 of 6,000 min"
      size="sm"
      fill="hatched"
      animate={false}
    />
  </div>
);

const TextArt = () => (
  <div className="absolute inset-0 flex items-center px-6 sm:px-8">
    <DitherText
      fill="gradient"
      direction="down"
      from={1}
      to={0.3}
      className="text-[clamp(4rem,9vw,7.5rem)] leading-[0.9] font-semibold tracking-[-0.06em]"
    >
      Headline
    </DitherText>
  </div>
);

const ImagesArt = () => (
  <DitherImage
    src="/examples/tetons.jpg"
    alt=""
    preset="duotone"
    color="ink"
    className="absolute inset-0 size-full"
  />
);

// A group with no art of its own: one even dither level.
const DefaultArt = () => (
  <div
    className="bg-dither-ink absolute inset-0 opacity-60"
    style={ditherMaskStyle(0.25)}
  />
);

const TILES = {
  backgrounds: {
    Art: BackgroundsArt,
    art: "h-64 sm:h-80 lg:h-auto lg:flex-1",
    span: "sm:col-span-2 lg:col-span-4 lg:row-span-2",
  },
  charts: { Art: ChartsArt, art: "h-48", span: "lg:col-span-2" },
  images: { Art: ImagesArt, art: "h-56 sm:h-64", span: "lg:col-span-3" },
  interface: { Art: InterfaceArt, art: "h-48", span: "lg:col-span-2" },
  text: { Art: TextArt, art: "h-56 sm:h-64", span: "lg:col-span-3" },
} as const satisfies Record<
  string,
  { Art: () => React.ReactNode; art: string; span: string }
>;

const DEFAULT_TILE = {
  Art: DefaultArt,
  art: "h-48",
  span: "lg:col-span-2",
} as const;

const isTileKey = (id: string): id is keyof typeof TILES =>
  Object.hasOwn(TILES, id);

const tileFor = (id: string) => (isTileKey(id) ? TILES[id] : DEFAULT_TILE);

const countLabel = (count: number) =>
  count === 1 ? "1 component" : `${count} components`;

const tileHref = (category: CatalogCategory) =>
  category.pieces[0]?.url ?? `${ROUTES.DOCS_EXAMPLES}#catalog-${category.id}`;

const Tile = ({ category }: { category: CatalogCategory }) => {
  const { Art, art, span } = tileFor(category.id);
  return (
    <li className={cn("flex", span)}>
      <Link
        href={tileHref(category)}
        transitionTypes={["nav-forward"]}
        className="group/tile bg-background hover:border-foreground/25 focus-visible:ring-ring/60 flex flex-1 flex-col overflow-hidden rounded-[24px] border transition-colors duration-200 outline-none focus-visible:ring-[3px]"
      >
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none relative isolate overflow-hidden",
            art
          )}
        >
          <Art />
        </div>
        <div className="flex flex-col gap-1.5 border-t p-5 sm:p-6">
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-lg font-medium tracking-[-0.02em] sm:text-xl">
              {category.name}
            </span>
            <span className="text-muted-foreground flex items-center gap-1 text-sm tabular-nums">
              {countLabel(category.pieces.length)}
              <Icon
                icon={ArrowRight01Icon}
                className="group-hover/tile:text-foreground size-4 shrink-0 transition-[color,translate] duration-200 ease-(--ease-out) group-hover/tile:translate-x-0.5 motion-reduce:transition-none"
              />
            </span>
          </span>
          <span className="text-muted-foreground text-sm text-pretty">
            {category.description}
          </span>
        </div>
      </Link>
    </li>
  );
};

export const CatalogTiles = ({
  catalog,
  className,
}: {
  catalog: CatalogCategory[];
  className?: string;
}) => (
  <ul
    className={cn(
      "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6",
      className
    )}
  >
    {catalog.map((category) => (
      <Tile key={category.id} category={category} />
    ))}
  </ul>
);
