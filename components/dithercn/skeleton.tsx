import type { ComponentProps, CSSProperties } from "react";

import { cssColor, ditherMask, fillStyle } from "@/lib/dither";
import type { DitherColor, FillVariant } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * A placeholder drawn entirely in dither, in one colour. At rest each
 * block is a faint tint under a Bayer ramp that thins from the left edge,
 * so it reads as dither even in a still frame. `sweep` runs a wide band
 * across it: four copies of the colour, each masked to a denser Bayer
 * level and clipped to a narrower slice, so the band's middle is densest
 * and its sides fall off level by level. `pulse` steps the whole block up
 * through three nested Bayer levels and back down, so the dots multiply
 * and thin out instead of fading. Only `clip-path` and opacity animate;
 * the masks stay put, so every dot stays on the cell grid.
 */

// Levels of the sweep, light to dense, with the half-width of each slice.
const BAND = [
  { halfWidth: 120, level: 4 / 16 },
  { halfWidth: 82, level: 6 / 16 },
  { halfWidth: 48, level: 8 / 16 },
  { halfWidth: 20, level: 11 / 16 },
] as const;

const REACH = BAND[0].halfWidth;

// Levels the pulse steps through, each switched on for a shorter span.
const PULSE = [4 / 16, 6 / 16, 9 / 16] as const;

const maskRule = (level: number) => {
  const image = ditherMask(level);
  const size = "calc(var(--dcn-cell) * 4)";
  return `-webkit-mask-image:${image};mask-image:${image};-webkit-mask-size:${size};mask-size:${size};`;
};

const pulseRule = (index: number) => {
  const on = 10 + index * 12;
  return `@keyframes dcn-skeleton-step-${index}{0%,${on - 0.1}%{opacity:0}${on}%,${100 - on}%{opacity:1}${100 - on + 0.1}%,100%{opacity:0}}.dcn-skeleton-pulse-${index}{${maskRule(PULSE[index] ?? 0.5)}opacity:0;animation:dcn-skeleton-step-${index} var(--dcn-duration) linear var(--dcn-delay) infinite}`;
};

const STYLES = [
  ...BAND.map(
    ({ level }, index) => `.dcn-skeleton-band-${index}{${maskRule(level)}}`
  ),
  ...PULSE.map((_, index) => pulseRule(index)),
  `@keyframes dcn-skeleton-sweep{0%{clip-path:inset(0 calc(100% + ${REACH}px - var(--dcn-half)) 0 calc(0% - ${REACH}px - var(--dcn-half)))}80%,100%{clip-path:inset(0 calc(0% - ${REACH}px - var(--dcn-half)) 0 calc(100% + ${REACH}px - var(--dcn-half)))}}`,
  ".dcn-skeleton-sweep{clip-path:inset(0 100% 0 0);animation:dcn-skeleton-sweep var(--dcn-duration) cubic-bezier(0.65,0,0.35,1) var(--dcn-delay) infinite}",
  "@media (prefers-reduced-motion: reduce){.dcn-skeleton-sweep{display:none}[class*=dcn-skeleton-pulse-]{animation:none}}",
].join("");

const SkeletonStyles = () => (
  <style href="dithercn-skeleton" precedence="dithercn">
    {STYLES}
  </style>
);

export type SkeletonAnimation = "sweep" | "pulse" | "none";

interface BlockShape {
  /** A rectangle. Size it with `className`. */
  shape?: "block";
  lines?: never;
  size?: never;
}

interface TextShape {
  /** Lines of text, the last one shorter. */
  shape: "text";
  /** How many lines. Default 3. */
  lines?: number;
  size?: never;
}

interface CircleShape {
  /** A circle, for avatars. */
  shape: "circle";
  /** Diameter in pixels. Default 40. */
  size?: number;
  lines?: never;
}

export type SkeletonShape = BlockShape | TextShape | CircleShape;

export type SkeletonProps = Omit<ComponentProps<"div">, "children" | "color"> &
  SkeletonShape & {
    /** A palette name or any CSS colour. Default `"grey"`. */
    color?: DitherColor;
    /** Texture of the resting layer: a Bayer ramp from the left, a dot lattice, diagonals, or a flat tint. Default `"gradient"`. */
    fill?: FillVariant;
    /** `sweep` runs a dense band across; `pulse` steps the dither up and down through its levels; `none` holds still. Default `"sweep"`. */
    animation?: SkeletonAnimation;
    /** Size of one dither cell in CSS pixels. Default 2. */
    cell?: number;
    /** Seconds for one sweep or pulse, including the pause after it. Default 1.8. */
    duration?: number;
    /** Seconds to wait before the first sweep. Default 0. */
    delay?: number;
  };

/** Inline styles that also carry custom properties. */
type StyleWithVars = CSSProperties & Record<`--${string}`, string>;

interface Look {
  color: DitherColor;
  fill: FillVariant;
  animation: SkeletonAnimation;
  cell: number;
  duration: number;
  delay: number;
}

type BarProps = Omit<ComponentProps<"div">, "children" | "color"> & Look;

// The resting texture: a ramp from the left for gradient, the tile for
// dotted and hatched, nothing extra for solid (its tint is stronger).
const textureStyle = ({ fill, color, cell }: Look): CSSProperties | null => {
  if (fill === "solid") {
    return null;
  }
  return fillStyle(fill, {
    cell,
    color,
    edge: "left",
    from: 0.375,
    length: 40,
    to: 0.125,
  });
};

const Bar = ({
  className,
  style,
  color,
  fill,
  animation,
  cell,
  duration,
  delay,
  ...rest
}: BarProps) => {
  const vars: StyleWithVars = {
    "--dcn-cell": `${cell}px`,
    "--dcn-delay": `${delay}s`,
    "--dcn-duration": `${duration}s`,
    "--dcn-skeleton": cssColor(color),
    ...style,
  };
  const texture = textureStyle({
    animation,
    cell,
    color,
    delay,
    duration,
    fill,
  });
  return (
    <div
      data-slot="skeleton"
      {...rest}
      className={cn("relative overflow-hidden rounded-md", className)}
      style={vars}
    >
      <SkeletonStyles />
      <div
        className={cn(
          "absolute inset-0 bg-(--dcn-skeleton)",
          fill === "solid" ? "opacity-[0.18]" : "opacity-[0.07]"
        )}
      />
      {texture === null ? null : (
        <div
          className="absolute inset-0"
          style={{ ...texture, opacity: 0.6 }}
        />
      )}
      {animation === "sweep"
        ? BAND.map(({ halfWidth }, index) => {
            const slice: StyleWithVars = { "--dcn-half": `${halfWidth}px` };
            return (
              <div
                key={halfWidth}
                className={cn(
                  "dcn-skeleton-sweep absolute inset-0 bg-(--dcn-skeleton) opacity-60",
                  `dcn-skeleton-band-${index}`
                )}
                style={slice}
              />
            );
          })
        : null}
      {animation === "pulse"
        ? PULSE.map((level, index) => (
            <div
              key={level}
              className={cn(
                "absolute inset-0 bg-(--dcn-skeleton)",
                `dcn-skeleton-pulse-${index}`
              )}
            />
          ))
        : null}
    </div>
  );
};

// The last line of a paragraph is rarely full.
const lineWidth = (index: number, count: number) =>
  count > 1 && index === count - 1 ? "62%" : "100%";

/**
 * A loading placeholder drawn in dither: a Bayer ramp at rest, and a band
 * of denser dither that sweeps across or a pulse that steps through levels. A block by default; `shape="text"`
 * draws lines and `shape="circle"` an avatar. It is hidden from assistive
 * technology: mark the region that is loading with `aria-busy` and
 * announce it in words.
 */
export const Skeleton = (props: SkeletonProps) => {
  const {
    shape: _shape,
    lines: _lines,
    size: _size,
    color = "grey",
    fill = "gradient",
    animation = "sweep",
    cell = 2,
    duration = 1.8,
    delay = 0,
    className,
    style,
    ...rest
  } = props;
  const look: Look = {
    animation,
    cell: Math.max(1, Math.round(cell)),
    color,
    delay,
    duration,
    fill,
  };

  switch (props.shape) {
    case "text": {
      const count = Math.max(1, Math.round(props.lines ?? 3));
      return (
        <div
          aria-hidden="true"
          {...rest}
          className={cn("flex w-full flex-col gap-2.5", className)}
          style={style}
        >
          {Array.from({ length: count }, (_, index) => (
            <Bar
              key={index}
              {...look}
              // Each line starts a beat after the one above, so the sweep reads as one wave.
              delay={delay + index * 0.08}
              className="h-3 rounded-[3px]"
              style={{ width: lineWidth(index, count) }}
            />
          ))}
        </div>
      );
    }
    case "circle": {
      const diameter = props.size ?? 40;
      return (
        <Bar
          aria-hidden="true"
          {...rest}
          {...look}
          className={cn("shrink-0 rounded-full", className)}
          style={{ height: diameter, width: diameter, ...style }}
        />
      );
    }
    case undefined:
    case "block": {
      return (
        <Bar
          aria-hidden="true"
          {...rest}
          {...look}
          className={className}
          style={style}
        />
      );
    }
    default: {
      const exhaustive: never = props;
      return exhaustive;
    }
  }
};
