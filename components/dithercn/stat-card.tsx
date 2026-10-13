"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ComponentProps, RefObject } from "react";

import {
  BloomGroup,
  cssColor,
  DitherPattern,
  ditherMaskStyle,
  FillPattern,
  readDitherCell,
  subscribeToTheme,
} from "@/lib/dither";
import type {
  Bloom,
  DitherColor,
  DitherMatrix,
  FillVariant,
} from "@/lib/dither";
import { cn } from "@/lib/utils";

/** Which way the metric should move: revenue `up`, latency `down`. */
export type StatDirection = "up" | "down";

export type StatCardProps = Omit<ComponentProps<"div">, "children"> & {
  /** What the number is, such as `"Monthly revenue"`. */
  label: string;
  /** The headline number. Numbers get thousands separators; strings show as given. */
  value: number | string;
  /** Change since the last period, in percent: `12.4` reads as +12.4%. */
  delta?: number;
  /** What the change compares with, such as `"vs last month"`. */
  deltaLabel?: string;
  /** Which direction counts as good, for the delta colour. Default `"up"`. */
  good?: StatDirection;
  /** Recent values, oldest first, drawn as a dithered area along the bottom. */
  trend?: readonly number[];
  /** Colour of the trend and the surface: a palette name or any CSS colour. Default `ink`. */
  color?: DitherColor;
  /** Texture under the trend line: `gradient` (bands that thin out below the line), `dotted`, `hatched` or `solid`. Default `gradient`. */
  fill?: FillVariant;
  /** Soft glow in `color` behind the trend: `off`, `low` or `high`. Default `off`. */
  bloom?: Bloom;
  /** Gradient only: threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Cell size in CSS pixels. Default `--dither-cell`. */
  cell?: number;
};

const TREND_HEIGHT = 56;
/** Bands under the line, each a step lighter; the last runs to the bottom. */
const BAND_LEVELS = [10 / 16, 6 / 16, 3 / 16, 1 / 16] as const;
const BAND_DEPTH = 7;
const SURFACE_LEVEL = 1 / 16;

/** `cell`, or `--dither-cell` as it applies to the element. 3 on the server. */
const useCellSize = (ref: RefObject<Element | null>, cell?: number) =>
  useSyncExternalStore(
    subscribeToTheme,
    () => cell ?? readDitherCell(ref.current),
    () => cell ?? 3
  );

/** The element's width in CSS pixels, 0 until measured. */
const useWidth = (ref: RefObject<Element | null>) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry?.contentRect.width ?? 0));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
};

const round = (value: number) => Math.round(value * 10) / 10;

interface Point {
  x: number;
  y: number;
}

const toPath = (points: readonly Point[]) =>
  points
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x} ${y}`)
    .join("");

/**
 * The trend line, plus one band per level that follows the line down: band
 * `k` lies between the line moved down `k` and `k + 1` band depths.
 */
const trendPaths = (
  values: readonly number[],
  width: number,
  height: number
) => {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const range = high - low || 1;
  // Leave room above the peak for the end marker, and a floor under the low.
  const top = 6;
  const floor = height * 0.3;
  const points = values.map((value, index) => ({
    x: round((index / Math.max(1, values.length - 1)) * width),
    y: round(top + (1 - (value - low) / range) * (height - top - floor)),
  }));
  const shifted = (depth: number) =>
    points.map(({ x, y }) => ({ x, y: Math.min(height, y + depth) }));
  const bands = BAND_LEVELS.map((_, index) => {
    const upper = toPath(shifted(index * BAND_DEPTH));
    const last = index === BAND_LEVELS.length - 1;
    const lower = last
      ? `L${width} ${height}L0 ${height}`
      : shifted((index + 1) * BAND_DEPTH)
          .toReversed()
          .map(({ x, y }) => `L${x} ${y}`)
          .join("");
    return `${upper}${lower}Z`;
  });
  return {
    area: `${toPath(points)}L${width} ${height}L0 ${height}Z`,
    bands,
    end: points.at(-1) ?? { x: width, y: height },
    line: toPath(points),
  };
};

const Trend = ({
  values,
  color,
  fill,
  bloom,
  matrix,
  cell,
}: {
  values: readonly number[];
  color: DitherColor;
  fill: FillVariant;
  bloom: Bloom;
  matrix: DitherMatrix;
  cell?: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const width = useWidth(ref);
  const cellSize = useCellSize(ref, cell);
  const prefix = `stat${useId().replaceAll(/[^a-zA-Z0-9]/g, "")}`;
  const height = TREND_HEIGHT;
  const paths =
    width > 0 && values.length > 1 ? trendPaths(values, width, height) : null;
  const marker = cellSize * 2;

  return (
    <div ref={ref} aria-hidden className="relative" style={{ height }}>
      {paths ? (
        <svg width={width} height={height} className="absolute inset-0 block">
          <defs>
            {fill === "gradient" ? (
              BAND_LEVELS.map((level, index) => (
                <DitherPattern
                  key={level}
                  id={`${prefix}-${index}`}
                  level={level}
                  matrix={matrix}
                  cell={cellSize}
                  color={color}
                />
              ))
            ) : (
              <FillPattern
                id={`${prefix}-area`}
                fill={fill}
                color={color}
                cell={cellSize}
              />
            )}
          </defs>
          <BloomGroup bloom={bloom} fill={cssColor(color)}>
            <path d={paths.area} />
          </BloomGroup>
          {fill === "gradient" ? (
            paths.bands.map((band, index) => (
              <path
                key={BAND_LEVELS[index]}
                d={band}
                fill={`url(#${prefix}-${index})`}
              />
            ))
          ) : (
            <path
              d={paths.area}
              fill={`url(#${prefix}-area)`}
              opacity={fill === "solid" ? 0.35 : 1}
            />
          )}
          <path
            d={paths.line}
            fill="none"
            stroke={cssColor(color)}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <rect
            x={Math.min(paths.end.x, width - marker / 2) - marker / 2}
            y={paths.end.y - marker / 2}
            width={marker}
            height={marker}
            fill={cssColor(color)}
          />
        </svg>
      ) : null}
    </div>
  );
};

const Arrow = ({ direction }: { direction: StatDirection }) => (
  <svg
    aria-hidden
    viewBox="0 0 8 8"
    className={cn("size-2 shrink-0", direction === "down" && "rotate-180")}
  >
    <path d="M4 1L7.5 6.5H0.5Z" fill="currentColor" />
  </svg>
);

/** A palette colour pulled toward the text colour, so small text keeps its contrast. */
const toneOf = (name: "green" | "red") =>
  `color-mix(in oklab, ${cssColor(name)}, var(--foreground) 22%)`;

/** Arrow direction, colour, visible text and spoken text for a delta. */
const describeDelta = (
  delta: number,
  good: StatDirection,
  deltaLabel: string | undefined
) => {
  const amount = `${Math.abs(delta).toFixed(1)}%`;
  const suffix = deltaLabel ? ` ${deltaLabel}` : "";
  if (delta === 0) {
    return {
      direction: null,
      spoken: `Unchanged${suffix}`,
      text: amount,
      tone: undefined,
    };
  }
  const direction: StatDirection = delta > 0 ? "up" : "down";
  return {
    direction,
    spoken: `${direction === "up" ? "Up" : "Down"} ${amount}${suffix}`,
    text: `${direction === "up" ? "+" : "−"}${amount}`,
    tone: toneOf(direction === good ? "green" : "red"),
  };
};

/**
 * A KPI card: label, headline value, a delta coloured by whether the move
 * is good, and an optional dithered area of the recent trend along the
 * bottom, all on a faint dot surface.
 */
export const StatCard = ({
  label,
  value,
  delta,
  deltaLabel,
  good = "up",
  trend,
  color = "ink",
  fill = "gradient",
  bloom = "off",
  matrix = "bayer4",
  cell,
  className,
  ...props
}: StatCardProps) => {
  const display =
    typeof value === "number"
      ? new Intl.NumberFormat("en-US").format(value)
      : value;
  const change =
    delta === undefined ? null : describeDelta(delta, good, deltaLabel);
  const hasTrend = trend !== undefined && trend.length > 1;
  const cellLength = cell === undefined ? "var(--dither-cell)" : `${cell}px`;

  return (
    <div
      className={cn(
        "bg-card text-card-foreground relative isolate flex flex-col overflow-hidden rounded-xl border",
        className
      )}
      {...props}
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(80%_70%_at_100%_0%,black,transparent_75%)]"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: cssColor(color),
            ...ditherMaskStyle(SURFACE_LEVEL, { cell: cellLength, matrix }),
          }}
        />
      </div>
      <div className={cn("flex flex-col gap-1 p-5", hasTrend && "pb-2")}>
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="text-3xl font-semibold tracking-tight tabular-nums">
          {display}
        </span>
        {change === null ? null : (
          <span className="mt-1 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1 font-mono font-medium tabular-nums",
                change.tone === undefined && "text-muted-foreground"
              )}
              style={{ color: change.tone }}
            >
              {change.direction ? <Arrow direction={change.direction} /> : null}
              <span aria-hidden>{change.text}</span>
              <span className="sr-only">{change.spoken}</span>
            </span>
            {deltaLabel ? (
              <span aria-hidden className="text-muted-foreground">
                {deltaLabel}
              </span>
            ) : null}
          </span>
        )}
      </div>
      {hasTrend ? (
        <Trend
          values={trend}
          color={color}
          fill={fill}
          bloom={bloom}
          matrix={matrix}
          cell={cell}
        />
      ) : null}
    </div>
  );
};
