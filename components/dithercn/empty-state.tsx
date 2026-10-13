import type { ComponentProps, CSSProperties, ReactNode } from "react";

import { cssColor, isInked } from "@/lib/dither";
import type { DitherColor, FillVariant } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * The scene is a grid of cells, rasterised once into SVG paths, with a
 * glyph tile at its centre. `rings` draws four concentric bands around
 * the tile, each a step lighter than the one inside it, and ripples them
 * outward by fading each band up and down in turn. `grid` draws a
 * lattice of single cells that thins out towards the edges, like a floor
 * the tile sits on. Both fade at the top and bottom through blue noise,
 * so the scene dissolves into the surface instead of stopping at a line.
 */

const COLS = 84;
const ROWS = 52;
const CX = COLS / 2;
const CY = ROWS / 2;

export type EmptyStateScene = "rings" | "grid" | "none";

/** Rings: radius and width in cells, and coverage for a gradient fill. */
const RINGS = [
  { level: 0.6, radius: 15, width: 2.4 },
  { level: 0.4, radius: 21, width: 2.2 },
  { level: 0.26, radius: 27, width: 2 },
  { level: 0.16, radius: 33, width: 1.8 },
] as const;

const SOLID_OPACITY = [0.7, 0.45, 0.3, 0.18] as const;

const mod4 = (value: number) => value % 4;

const TEXTURE = {
  dotted: (x: number, y: number) => y % 2 === 0 && (mod4(x) + y / 2) % 2 === 0,
  hatched: (x: number, y: number) => mod4(x + y) === 3,
} as const;

/** 1 in the middle band, falling to 0 at the top and bottom edges. */
const edgeFade = (y: number) => {
  const from = Math.min(y + 0.5, ROWS - y - 0.5) / (ROWS * 0.32);
  return Math.min(1, from);
};

const ringInked = (fill: FillVariant, level: number, x: number, y: number) => {
  if (!isInked("blue-noise", x, y, edgeFade(y))) {
    return false;
  }
  switch (fill) {
    case "gradient": {
      return isInked("bayer4", x, y, level);
    }
    case "dotted":
    case "hatched": {
      return TEXTURE[fill](x, y);
    }
    case "solid": {
      return true;
    }
    default: {
      const exhaustive: never = fill;
      return exhaustive;
    }
  }
};

const cellRect = (x: number, y: number) => `M${x} ${y}h1v1h-1z`;

const ringCache = new Map<FillVariant, readonly string[]>();

/** One path per ring, so each can fade on its own. */
const ringPaths = (fill: FillVariant) => {
  const cached = ringCache.get(fill);
  if (cached !== undefined) {
    return cached;
  }
  const paths = RINGS.map(({ radius, width, level }) => {
    let d = "";
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const distance = Math.hypot(x + 0.5 - CX, (y + 0.5 - CY) * 1.08);
        if (
          Math.abs(distance - radius) < width / 2 &&
          ringInked(fill, level, x, y)
        ) {
          d += cellRect(x, y);
        }
      }
    }
    return d;
  });
  ringCache.set(fill, paths);
  return paths;
};

let gridCache: string | undefined;

/** A lattice every third cell, thinning out with distance from the centre. */
const gridPath = () => {
  if (gridCache !== undefined) {
    return gridCache;
  }
  let d = "";
  for (let y = 1; y < ROWS; y += 3) {
    for (let x = 0; x < COLS; x += 3) {
      const distance = Math.hypot((x + 0.5 - CX) / CX, (y + 0.5 - CY) / CY);
      const tone = Math.max(0, 1 - distance) ** 0.8 * 1.15;
      if (isInked("bayer4", x / 3, (y - 1) / 3, tone)) {
        d += cellRect(x, y);
      }
    }
  }
  gridCache = d;
  return d;
};

const STYLES = [
  "@keyframes dcn-empty-ripple{0%,100%{opacity:0.4}30%{opacity:1}}",
  ".dcn-empty-ring{animation:dcn-empty-ripple 3.6s cubic-bezier(0.77,0,0.175,1) var(--dcn-delay) infinite both}",
  "@media (prefers-reduced-motion: reduce){.dcn-empty-ring{animation:none}}",
].join("");

type StyleWithVars = CSSProperties & Record<`--${string}`, string>;

interface SceneProps {
  scene: EmptyStateScene;
  fill: FillVariant;
  color: DitherColor;
  animate: boolean;
}

const Scene = ({ scene, fill, color, animate }: SceneProps) => {
  if (scene === "none") {
    return null;
  }
  const ink = cssColor(color);
  return (
    <>
      <style href="dithercn-empty-state" precedence="dithercn">
        {STYLES}
      </style>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${COLS} ${ROWS}`}
        shapeRendering="crispEdges"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 size-full"
      >
        {scene === "grid" ? (
          <path d={gridPath()} style={{ fill: ink, opacity: 0.6 }} />
        ) : (
          ringPaths(fill).map((d, index) => {
            const style: StyleWithVars = {
              "--dcn-delay": `${index * 0.45}s`,
              fill: ink,
              opacity: fill === "solid" ? SOLID_OPACITY[index] : undefined,
            };
            return (
              <path
                key={RINGS[index]?.radius ?? index}
                d={d}
                className={animate ? "dcn-empty-ring" : undefined}
                style={style}
              />
            );
          })
        )}
      </svg>
    </>
  );
};

/** A dashed square: the default glyph, for "nothing here yet". */
const EmptyGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect
      x="4.5"
      y="4.5"
      width="15"
      height="15"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeDasharray="3 2.6"
    />
    <path
      d="M9.5 12h5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export type EmptyStateProps = Omit<ComponentProps<"div">, "title" | "color"> & {
  /** The heading. Say what is empty, plainly. */
  title: ReactNode;
  /** One or two sentences: why it is empty and what to do next. */
  description?: ReactNode;
  /** Buttons or links, under the text. */
  action?: ReactNode;
  /** The glyph in the tile, such as an icon from your icon set. Default: a dashed square. */
  icon?: ReactNode;
  /** What surrounds the tile. Default `"rings"`. */
  scene?: EmptyStateScene;
  /** Texture of the rings. Default `"gradient"`. */
  fill?: FillVariant;
  /** Colour of the scene: a palette name or any CSS colour. Default `"ink"`. */
  color?: DitherColor;
  /** Ripple the rings outward. Default `true`. */
  animate?: boolean;
  /** Heading level. Default `"h3"`. */
  titleAs?: "h2" | "h3" | "h4";
};

/**
 * A placeholder for a view with nothing in it yet: a glyph tile in a
 * dithered scene, a title, a short description and an action.
 */
export const EmptyState = ({
  title,
  description,
  action,
  icon,
  scene = "rings",
  fill = "gradient",
  color = "ink",
  animate = true,
  titleAs: Heading = "h3",
  className,
  ...props
}: EmptyStateProps) => (
  <div
    data-slot="empty-state"
    className={cn(
      "flex flex-col items-center px-6 py-10 text-center",
      className
    )}
    {...props}
  >
    <div
      className={cn(
        "relative grid w-full max-w-[336px] place-items-center",
        scene === "none" ? "h-auto" : "aspect-[84/52]"
      )}
    >
      <Scene scene={scene} fill={fill} color={color} animate={animate} />
      <div className="bg-background text-foreground ring-border relative grid size-14 place-items-center rounded-2xl shadow-[0_1px_2px_oklch(0_0_0/0.12),0_8px_24px_-8px_oklch(0_0_0/0.35)] ring-1 [&_svg:not([class*='size-'])]:size-6">
        {icon ?? <EmptyGlyph />}
      </div>
    </div>
    <div className="mt-4 flex max-w-sm flex-col gap-1.5">
      <Heading className="text-base font-semibold tracking-tight text-balance">
        {title}
      </Heading>
      {description === undefined ? null : (
        <p className="text-muted-foreground text-sm text-pretty">
          {description}
        </p>
      )}
    </div>
    {action === undefined ? null : (
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {action}
      </div>
    )}
  </div>
);
