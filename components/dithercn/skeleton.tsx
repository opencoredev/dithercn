import type { ComponentProps, CSSProperties } from "react";

import { ditherMask } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * A loading placeholder in two layers of the same colour. The base is a
 * sparse dither at a quarter of the colour's strength. Over it, a band of
 * denser dither sweeps from left to right: five copies of the fill, each
 * masked to one Bayer level and clipped to a narrower slice of the band, so
 * the centre of the band reaches the densest level and its edges fall off
 * through the lighter ones. Only `clip-path` animates; the masks stay put,
 * so every dot stays on the cell grid while the band moves.
 */

// Levels of the sweep, light to dense, with the half-width of each slice.
const BAND = [
  { halfWidth: 72, level: 4 / 16 },
  { halfWidth: 52, level: 6 / 16 },
  { halfWidth: 34, level: 8 / 16 },
  { halfWidth: 19, level: 10 / 16 },
  { halfWidth: 7, level: 12 / 16 },
] as const;

const BASE_LEVEL = 3 / 16;
const REACH = BAND[0].halfWidth;

const maskRule = (level: number) => {
  const image = ditherMask(level);
  const size = "calc(var(--dither-cell, 3px) * 4)";
  return `-webkit-mask-image:${image};mask-image:${image};-webkit-mask-size:${size};mask-size:${size};`;
};

const STYLES = [
  `.dcn-skeleton-base{${maskRule(BASE_LEVEL)}}`,
  ...BAND.map(
    ({ level }, index) => `.dcn-skeleton-band-${index}{${maskRule(level)}}`
  ),
  `@keyframes dcn-skeleton-sweep{0%{clip-path:inset(0 calc(100% + ${REACH}px - var(--dcn-half)) 0 calc(0% - ${REACH}px - var(--dcn-half)))}70%,100%{clip-path:inset(0 calc(0% - ${REACH}px - var(--dcn-half)) 0 calc(100% + ${REACH}px - var(--dcn-half)))}}`,
  ".dcn-skeleton-sweep{clip-path:inset(0 100% 0 0);animation:dcn-skeleton-sweep var(--dcn-duration) linear var(--dcn-delay) infinite}",
  "@media (prefers-reduced-motion: reduce){.dcn-skeleton-sweep{display:none}}",
].join("");

const SkeletonStyles = () => (
  <style href="dithercn-skeleton" precedence="dithercn">
    {STYLES}
  </style>
);

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

export type SkeletonProps = Omit<ComponentProps<"div">, "children"> &
  SkeletonShape & {
    /** Colour of the dots. Default `--dither-ink`. */
    color?: string;
    /** Seconds for one sweep, including the pause after it. Default 2. */
    duration?: number;
    /** Seconds to wait before the first sweep. Default 0. */
    delay?: number;
  };

const toCss = (color: string) =>
  color.startsWith("--") ? `var(${color})` : color;

/** Inline styles that also carry custom properties. */
type StyleWithVars = CSSProperties & Record<`--${string}`, string>;

type BarProps = Omit<ComponentProps<"div">, "children" | "color"> & {
  color: string;
  duration: number;
  delay: number;
};

const Bar = ({
  className,
  style,
  color,
  duration,
  delay,
  ...rest
}: BarProps) => {
  const vars: StyleWithVars = {
    "--dcn-delay": `${delay}s`,
    "--dcn-duration": `${duration}s`,
    "--dcn-skeleton": toCss(color),
    ...style,
  };
  return (
    <div
      data-slot="skeleton"
      {...rest}
      className={cn("relative overflow-hidden rounded-md", className)}
      style={vars}
    >
      <SkeletonStyles />
      <div className="absolute inset-0 bg-(--dcn-skeleton) opacity-[0.07]" />
      <div className="dcn-skeleton-base absolute inset-0 bg-(--dcn-skeleton) opacity-45" />
      {BAND.map(({ halfWidth }, index) => {
        const slice: StyleWithVars = { "--dcn-half": `${halfWidth}px` };
        return (
          <div
            key={halfWidth}
            className={cn(
              "dcn-skeleton-sweep absolute inset-0 bg-(--dcn-skeleton)",
              `dcn-skeleton-band-${index}`
            )}
            style={slice}
          />
        );
      })}
    </div>
  );
};

// The last line of a paragraph is rarely full.
const lineWidth = (index: number, count: number) =>
  count > 1 && index === count - 1 ? "62%" : "100%";

/**
 * A loading placeholder whose shimmer moves through dither levels. A block
 * by default; `shape="text"` draws lines and `shape="circle"` an avatar.
 * It is hidden from assistive technology: mark the region that is loading
 * with `aria-busy` and announce it in words.
 */
export const Skeleton = (props: SkeletonProps) => {
  const {
    shape: _shape,
    lines: _lines,
    size: _size,
    color = "--dither-ink",
    duration = 2,
    delay = 0,
    className,
    style,
    ...rest
  } = props;
  const bar = { color, delay, duration };

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
              {...bar}
              // Each line starts a beat after the one above, so the sweep reads as one wave.
              delay={delay + index * 0.09}
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
          {...bar}
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
          {...bar}
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
