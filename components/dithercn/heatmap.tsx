"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ComponentProps, KeyboardEvent, PointerEvent } from "react";

import {
  cssColor,
  DitherPattern,
  MOTION,
  readDitherCell,
  useFrameLoop,
} from "@/lib/dither";
import type { DitherColor } from "@/lib/dither";
import { cn } from "@/lib/utils";

export interface HeatmapDatum {
  /** The day, as `"YYYY-MM-DD"` or a `Date` (read in UTC). */
  date: string | Date;
  /** The day's value. Several entries for one day add up. */
  value: number;
}

export interface HeatmapProps extends Omit<ComponentProps<"div">, "children"> {
  /** Values by day. Days without an entry count as 0. */
  data: readonly HeatmapDatum[];
  /** Number of weeks shown, ending with the latest day in `data`. Default 53. */
  weeks?: number;
  /** First day of each column: 0 Sunday, 1 Monday. Default 0. */
  weekStart?: 0 | 1;
  /**
   * How many densities the values map to, above empty. 4 reads like a
   * contribution graph; 16 gives every level a 4×4 Bayer tile can draw.
   * Default 4.
   */
  steps?: number;
  /** The value drawn solid. Default: the largest value. */
  max?: number;
  /** What a value counts, for the readout: `"deploy"` or `{ one: "deploy", other: "deploys" }`. */
  unit?: string | { one: string; other: string };
  /** Ink colour. Default `--dither-ink`. */
  color?: DitherColor;
  /** Dither cell in px. Each day is 4×4 cells. Default `--dither-cell`. */
  cell?: number;
  /** Show the Less/More key. Default true. */
  legend?: boolean;
}

const DAY_MS = 86_400_000;
/** Width of the weekday label column, which stays put while the grid scrolls. */
const LEFT = 30;
const TOP = 18;
const WEEKDAY_LABELS: Record<number, string> = { 1: "Mon", 3: "Wed", 5: "Fri" };

/** Days since the epoch, in UTC, so time zones never shift a square. */
const dayNumber = (date: string | Date) => {
  if (typeof date !== "string") {
    return Math.floor(date.getTime() / DAY_MS);
  }
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return Math.floor(
    Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1) / DAY_MS
  );
};

const dateOf = (day: number) => new Date(day * DAY_MS);

const longDate = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  weekday: "short",
  year: "numeric",
});
const shortDate = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});
const monthName = new Intl.DateTimeFormat("en", {
  month: "short",
  timeZone: "UTC",
});
const count = new Intl.NumberFormat("en");

const withUnit = (value: number, unit: HeatmapProps["unit"]) => {
  if (unit === undefined) {
    return count.format(value);
  }
  if (typeof unit === "string") {
    return `${count.format(value)} ${unit}`;
  }
  return `${count.format(value)} ${value === 1 ? unit.one : unit.other}`;
};

/** Snap a length to whole device pixels so dither cells stay sharp. */
const snapToDevice = (px: number) => {
  const dpr = window.devicePixelRatio || 1;
  return Math.max(1, Math.round(px * dpr)) / dpr;
};

/** 0 → 1 over the entrance once on screen; 1 at once under reduced motion. */
const useReveal = (target: { current: Element | null }) => {
  const [progress, setProgress] = useState(0);
  const duration = (MOTION.slow + MOTION.base) / 1000;
  useFrameLoop(
    (time) => {
      const linear = Math.min(1, time / duration);
      setProgress(Math.round((1 - (1 - linear) ** 3) * 16) / 16);
    },
    { enabled: progress < 1, stillTime: duration, target }
  );
  return progress;
};

interface CalendarOptions {
  data: readonly HeatmapDatum[];
  weeks: number;
  weekStart: 0 | 1;
  steps: number;
  max: number | undefined;
}

/**
 * The grid in days and columns: each day's bucket, where the month labels
 * go, and the totals the summary reads. No pixels here.
 */
const buildCalendar = ({
  data,
  weeks,
  weekStart,
  steps,
  max,
}: CalendarOptions) => {
  const totals = new Map<number, number>();
  for (const datum of data) {
    const day = dayNumber(datum.date);
    totals.set(day, (totals.get(day) ?? 0) + datum.value);
  }
  const days = [...totals.keys()];
  const lastDay = days.length > 0 ? Math.max(...days) : 0;
  // Weekday of the last day, counted from `weekStart` (1970-01-01 was a Thursday).
  const lastColumnStart = lastDay - ((((lastDay + 4 - weekStart) % 7) + 7) % 7);
  const columns = Math.max(1, weeks);
  const firstDay = lastColumnStart - (columns - 1) * 7;
  const peak = max ?? Math.max(1, ...totals.values());
  const levels = Math.max(1, Math.round(steps));

  const squares: {
    bucket: number;
    column: number;
    day: number;
    row: number;
  }[] = [];
  let total = 0;
  let busiest = lastDay;
  for (let day = firstDay; day <= lastDay; day += 1) {
    const value = totals.get(day) ?? 0;
    total += value;
    if (value > (totals.get(busiest) ?? 0)) {
      busiest = day;
    }
    const scaled = Math.ceil((value / peak) * levels);
    const offset = day - firstDay;
    squares.push({
      bucket: value <= 0 ? 0 : Math.min(levels, Math.max(1, scaled)),
      column: Math.floor(offset / 7),
      day,
      row: offset % 7,
    });
  }

  const months: { column: number; label: string }[] = [];
  let previousMonth = -1;
  let previousColumn = -10;
  for (let column = 0; column < columns; column += 1) {
    const date = dateOf(firstDay + column * 7);
    const month = date.getUTCMonth();
    // A month needs about three columns of room for its label.
    const fits =
      column - previousColumn >= 3 && (column > 0 || date.getUTCDate() <= 7);
    if (month !== previousMonth && fits) {
      months.push({ column, label: monthName.format(date) });
      previousColumn = column;
    }
    previousMonth = month;
  }

  return { busiest, firstDay, lastDay, levels, months, squares, total, totals };
};

/**
 * A calendar heatmap, one square per day and one column per week. Each
 * square is exactly one 4×4 dither tile, so its density is the value.
 * Hover or focus it to read any day; arrow keys move between days.
 */
export const Heatmap = ({
  data,
  weeks = 53,
  weekStart = 0,
  steps = 4,
  max,
  unit,
  color = "--dither-ink",
  cell,
  legend = true,
  className,
  "aria-label": ariaLabel,
  ...props
}: HeatmapProps) => {
  const uid = useId().replaceAll(":", "");
  const ref = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const reveal = useReveal(ref);
  const [px, setPx] = useState(cell ?? 3);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    setPx(snapToDevice(cell ?? readDitherCell(ref.current)));
  }, [cell]);

  // Keep the latest weeks in view when the grid is wider than its box.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) {
      scroller.scrollLeft = scroller.scrollWidth;
    }
  }, [px]);

  const { busiest, firstDay, lastDay, levels, months, squares, total, totals } =
    buildCalendar({ data, max, steps, weekStart, weeks });
  const size = px * 4;
  const pitch = px * 5;
  const width = Math.max(1, weeks) * pitch - px;
  const height = TOP + 7 * pitch - px;
  const inRange = (day: number) => day >= firstDay && day <= lastDay;
  const summary = `Calendar heatmap, ${shortDate.format(dateOf(firstDay))} to ${shortDate.format(dateOf(lastDay))}: ${withUnit(total, unit)} in total, busiest day ${shortDate.format(dateOf(busiest))} with ${withUnit(totals.get(busiest) ?? 0, unit)}.`;

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const column = Math.floor((event.clientX - rect.left) / pitch);
    const row = Math.floor((event.clientY - rect.top - TOP) / pitch);
    const day = firstDay + column * 7 + row;
    setActive(column >= 0 && row >= 0 && row < 7 && inRange(day) ? day : null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = active ?? lastDay;
    const moves: Record<string, number> = {
      ArrowDown: current + 1,
      ArrowLeft: current - 7,
      ArrowRight: current + 7,
      ArrowUp: current - 1,
      End: lastDay,
      Home: firstDay,
    };
    const next = moves[event.key];
    if (next === undefined) {
      if (event.key === "Escape") {
        setActive(null);
      }
      return;
    }
    event.preventDefault();
    setActive(Math.min(lastDay, Math.max(firstDay, next)));
  };

  const activeSquare =
    active === null
      ? undefined
      : squares.find((square) => square.day === active);
  const ink = cssColor(color);
  const legendBuckets = Array.from(
    { length: Math.min(levels, 4) + 1 },
    (_, index) => Math.round((index / Math.min(levels, 4)) * levels)
  );

  return (
    <div {...props} ref={ref} className={cn("w-full", className)}>
      <div
        role="group"
        aria-label={ariaLabel ?? summary}
        aria-roledescription="calendar heatmap"
        // A focusable group: the arrow keys move the readout between days.
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => setActive((current) => current ?? lastDay)}
        onBlur={() => setActive(null)}
        className="focus-visible:ring-ring/60 flex rounded-sm outline-none focus-visible:ring-2"
      >
        <svg
          aria-hidden="true"
          width={LEFT}
          height={height}
          className="block shrink-0 select-none"
        >
          {Array.from({ length: 7 }, (_, row) => {
            const label = WEEKDAY_LABELS[(row + weekStart) % 7];
            return label === undefined ? null : (
              <text
                key={label}
                x={0}
                y={TOP + row * pitch + size / 2}
                dy="0.32em"
                className="fill-muted-foreground font-mono text-[10px]"
              >
                {label}
              </text>
            );
          })}
        </svg>
        <div
          ref={scrollerRef}
          className="min-w-0 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]"
        >
          <svg
            aria-hidden="true"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="block select-none"
            onPointerMove={onPointerMove}
            onPointerLeave={() => setActive(null)}
          >
            <defs>
              {Array.from({ length: levels + 1 }, (_, bucket) => bucket).map(
                (bucket) => (
                  <DitherPattern
                    key={bucket}
                    id={`${uid}-b${bucket}`}
                    level={Math.round((bucket / levels) * reveal * 16) / 16}
                    cell={px}
                    color={color}
                  />
                )
              )}
            </defs>
            {months.map((month) => (
              <text
                key={month.column}
                x={month.column * pitch}
                y={10}
                className="fill-muted-foreground font-mono text-[10px]"
              >
                {month.label}
              </text>
            ))}
            {squares.map((square) => (
              <g key={square.day}>
                <rect
                  x={square.column * pitch}
                  y={TOP + square.row * pitch}
                  width={size}
                  height={size}
                  className="fill-muted"
                  shapeRendering="crispEdges"
                />
                {square.bucket === 0 ? null : (
                  <rect
                    x={square.column * pitch}
                    y={TOP + square.row * pitch}
                    width={size}
                    height={size}
                    fill={`url(#${uid}-b${square.bucket})`}
                    shapeRendering="crispEdges"
                  />
                )}
              </g>
            ))}
            {activeSquare === undefined ? null : (
              <rect
                x={activeSquare.column * pitch - 1.5}
                y={TOP + activeSquare.row * pitch - 1.5}
                width={size + 3}
                height={size + 3}
                fill="none"
                stroke={ink}
                strokeWidth={1}
                rx={1}
              />
            )}
          </svg>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs">
        <p aria-live="polite" className="text-muted-foreground min-h-4">
          {active === null ? null : (
            <>
              <span className="text-foreground font-medium tabular-nums">
                {withUnit(totals.get(active) ?? 0, unit)}
              </span>{" "}
              on {longDate.format(dateOf(active))}
            </>
          )}
        </p>
        {legend ? (
          <div
            aria-hidden="true"
            className="text-muted-foreground flex items-center gap-1.5"
          >
            <span className="mr-1">Less</span>
            <svg
              width={legendBuckets.length * pitch - px}
              height={size}
              className="block"
            >
              {legendBuckets.map((bucket, index) => (
                <g key={bucket}>
                  <rect
                    x={index * pitch}
                    width={size}
                    height={size}
                    className="fill-muted"
                  />
                  <rect
                    x={index * pitch}
                    width={size}
                    height={size}
                    fill={`url(#${uid}-b${bucket})`}
                    shapeRendering="crispEdges"
                  />
                </g>
              ))}
            </svg>
            <span className="ml-1">More</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
