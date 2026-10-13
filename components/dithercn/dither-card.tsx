import { useId } from "react";
import type { ComponentProps, CSSProperties } from "react";

import { DitherPattern, FillPattern } from "@/lib/dither";
import type { DitherColor, DitherMatrix, FillVariant } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * The glow is a stack of rings drawn from a corner (or ellipses from an
 * edge), largest and lightest first. Each ring is filled with a denser
 * dither than the one under it; Bayer levels nest, so the stack reads as
 * one smooth falloff with every dot on the same grid. The hover layer is a
 * second, larger and denser stack whose rings switch on one after another,
 * innermost first, so the glow grows outward through the levels instead of
 * fading. Leaving the card switches them off in reverse. With a dotted,
 * hatched or solid fill, every ring shares one texture at a low opacity,
 * and the overlap of the stack builds the falloff instead.
 *
 * The rim is a third, much wider stack, masked to a band one cell wide
 * just inside the card's edge. It is dense where the glow sits and thins
 * out round the card, so the border catches the light like a rim.
 */

export type DitherCardGlow =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top"
  | "bottom";

export type DitherCardProps = Omit<ComponentProps<"div">, "color"> & {
  /** Where the glow sits. Default `"top-left"`. */
  glow?: DitherCardGlow;
  /** Glow size in pixels, from its origin to where it fades out. Default 240. */
  reach?: number;
  /** Densest dither level, at the origin, 0 to 1. Default 0.5. */
  strength?: number;
  /** Grow and densify the glow on hover and keyboard focus. Default `false`. */
  interactive?: boolean;
  /** Glow colour: a palette name or any CSS colour. Default `"ink"`. */
  color?: DitherColor;
  /** Texture of the glow. Default `"gradient"`. */
  fill?: FillVariant;
  /** Threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Size of one dither cell in CSS pixels. Default 3. */
  cell?: number;
  /** Light the card's border with dither, densest near the glow. Default `true`. */
  rim?: boolean;
  /** Corner radius in pixels, matched by the rim. Default 14. */
  radius?: number;
};

const RINGS = 9;
// Milliseconds between rings when the hover glow grows or shrinks.
const RING_STEP = 26;

const STYLES = [
  ".dcn-card-boost{opacity:0;transition:opacity 0s linear var(--dcn-out)}",
  "@media (hover: hover){.dcn-card:hover .dcn-card-boost{opacity:1;transition-delay:var(--dcn-in)}}",
  ".dcn-card:focus-within .dcn-card-boost{opacity:1;transition-delay:var(--dcn-in)}",
  "@media (prefers-reduced-motion: reduce){.dcn-card-boost{transition-delay:0s!important}}",
].join("");

type StyleWithVars = CSSProperties & Record<`--${string}`, string>;

interface Origin {
  cx: string;
  cy: string;
  /** Edge glows are ellipses, wider than they are tall. */
  stretch: number;
}

const ORIGINS = {
  bottom: { cx: "50%", cy: "100%", stretch: 1.8 },
  "bottom-left": { cx: "0%", cy: "100%", stretch: 1 },
  "bottom-right": { cx: "100%", cy: "100%", stretch: 1 },
  top: { cx: "50%", cy: "0%", stretch: 1.8 },
  "top-left": { cx: "0%", cy: "0%", stretch: 1 },
  "top-right": { cx: "100%", cy: "0%", stretch: 1 },
} as const satisfies Record<DitherCardGlow, Origin>;

interface Ring {
  radius: number;
  level: number;
}

/** Rings from the outside in: radius falls linearly, level rises with an ease. */
const ringsFor = (reach: number, strength: number): Ring[] =>
  Array.from({ length: RINGS }, (_, index) => {
    const t = (index + 1) / RINGS;
    return {
      level: strength * t ** 2.2,
      radius: reach * (1 - (index / RINGS) * 0.92),
    };
  });

// Opacity of each ring when the rings share one texture; nine overlap at the origin.
const TEXTURE_OPACITY = 0.2;

const RingStack = ({
  id,
  texture,
  rings,
  origin,
  boost,
  mask,
}: {
  id: string;
  /** The shared texture's id, or undefined for one dither level per ring. */
  texture: string | undefined;
  rings: Ring[];
  origin: Origin;
  boost: boolean;
  mask?: string;
}) => (
  <g mask={mask === undefined ? undefined : `url(#${mask})`}>
    {rings.map(({ radius }, index) => {
      const timing: StyleWithVars | undefined = boost
        ? {
            // Index 0 is the outermost ring: it switches on last and off first.
            "--dcn-in": `${(RINGS - 1 - index) * RING_STEP}ms`,
            "--dcn-out": `${index * RING_STEP}ms`,
          }
        : undefined;
      return (
        <ellipse
          key={radius}
          className={boost ? "dcn-card-boost" : undefined}
          style={timing}
          cx={origin.cx}
          cy={origin.cy}
          rx={radius * origin.stretch}
          ry={radius}
          fill={
            texture === undefined ? `url(#${id}-${index})` : `url(#${texture})`
          }
          fillOpacity={texture === undefined ? undefined : TEXTURE_OPACITY}
        />
      );
    })}
  </g>
);

/**
 * A card surface with a dithered glow in one corner or along one edge.
 * It carries shadcn Card's spacing and colours, so `CardHeader`,
 * `CardContent` and `CardFooter` drop straight in. With `interactive`, the
 * glow grows through the dither levels on hover and focus.
 */
export const DitherCard = ({
  glow = "top-left",
  reach = 240,
  strength = 0.5,
  interactive = false,
  color = "ink",
  fill = "gradient",
  matrix = "bayer4",
  cell = 3,
  rim = true,
  radius = 14,
  className,
  style,
  children,
  ...props
}: DitherCardProps) => {
  const id = useId();
  const origin = ORIGINS[glow];
  const level = Math.min(1, Math.max(0, strength));
  const rings = ringsFor(reach, level);
  const boosted = ringsFor(reach * 1.3, Math.min(1, level * 1.4));
  const texture = fill === "gradient" ? undefined : `${id}-texture`;
  const rimRings = ringsFor(reach * 1.9, 1);

  return (
    <div
      data-slot="card"
      data-glow={glow}
      className={cn(
        "bg-card text-card-foreground relative isolate flex flex-col gap-6 overflow-hidden border py-6 shadow-sm",
        interactive && "dcn-card",
        className
      )}
      {...props}
      style={{ borderRadius: radius, ...style }}
    >
      {interactive ? (
        <style href="dithercn-dither-card" precedence="dithercn">
          {STYLES}
        </style>
      ) : null}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 size-full"
        shapeRendering="crispEdges"
      >
        <defs>
          {texture === undefined ? null : (
            <FillPattern id={texture} fill={fill} color={color} cell={cell} />
          )}
          {rings.map((ring, index) => (
            <DitherPattern
              key={ring.radius}
              id={`${id}-${index}`}
              level={ring.level}
              matrix={matrix}
              cell={cell}
              color={color}
            />
          ))}
          {rim
            ? rimRings.map((ring, index) => (
                <DitherPattern
                  key={ring.radius}
                  id={`${id}-rim-${index}`}
                  level={ring.level}
                  matrix={matrix}
                  cell={cell}
                  color={color}
                />
              ))
            : null}
          {rim ? (
            // One cell inside the edge; the outer half of the stroke falls outside the box.
            <mask id={`${id}-rim-mask`}>
              <rect
                width="100%"
                height="100%"
                rx={radius}
                fill="none"
                stroke="white"
                strokeWidth={cell * 2}
              />
            </mask>
          ) : null}
          {interactive
            ? boosted.map((ring, index) => (
                <DitherPattern
                  key={ring.radius}
                  id={`${id}-boost-${index}`}
                  level={ring.level}
                  matrix={matrix}
                  cell={cell}
                  color={color}
                />
              ))
            : null}
        </defs>
        <RingStack
          id={id}
          texture={texture}
          rings={rings}
          origin={origin}
          boost={false}
        />
        {interactive ? (
          <RingStack
            id={`${id}-boost`}
            texture={texture}
            rings={boosted}
            origin={origin}
            boost
          />
        ) : null}
        {rim ? (
          <RingStack
            id={`${id}-rim`}
            texture={undefined}
            rings={rimRings}
            origin={origin}
            boost={false}
            mask={`${id}-rim-mask`}
          />
        ) : null}
      </svg>
      {children}
    </div>
  );
};
