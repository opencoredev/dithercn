"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import type { ComponentProps, RefObject } from "react";

import {
  cssColor,
  DitherPattern,
  MOTION,
  readDitherCell,
  subscribeToTheme,
} from "@/lib/dither";
import type { DitherColor, DitherMatrix } from "@/lib/dither";
import { cn } from "@/lib/utils";

export interface DonutSegment {
  /** Name shown in the legend. */
  label: string;
  /** Size of the segment. Negative values count as 0. */
  value: number;
  /** Ink colour for this segment. Default: the chart's `color`. */
  color?: DitherColor;
  /** Share of cells inked, 0 to 1. Default: a step lighter for each segment. */
  level?: number;
}

export type DonutChartProps = Omit<ComponentProps<"figure">, "children"> & {
  /** The segments, drawn clockwise from the top. */
  data: readonly DonutSegment[];
  /** What the total counts, shown under it in the centre. */
  label: string;
  /** Diameter in CSS pixels. Default 200. */
  size?: number;
  /** Ring thickness in CSS pixels. Default 15% of `size`. */
  thickness?: number;
  /** Shown after every value, such as `" GB"`. */
  unit?: string;
  /** `Intl.NumberFormat` options for values. Default: whole numbers with separators. */
  format?: Intl.NumberFormatOptions;
  /** Show the legend. When false it stays available to screen readers. Default true. */
  legend?: boolean;
  /** Ink colour for segments without their own. Default `--dither-ink`. */
  color?: DitherColor;
  /** Threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Cell size in CSS pixels. Default `--dither-cell`. */
  cell?: number;
};

/** One density per segment, densest first, so segments read apart in one ink. */
const LEVELS = [1, 11 / 16, 7 / 16, 4 / 16, 2 / 16] as const;
const GAP_PX = 3;

/** `cell`, or `--dither-cell` as it applies to the element. 3 on the server. */
const useCellSize = (ref: RefObject<Element | null>, cell?: number) =>
  useSyncExternalStore(
    subscribeToTheme,
    () => cell ?? readDitherCell(ref.current),
    () => cell ?? 3
  );

const levelAt = (index: number) => LEVELS[index % LEVELS.length] ?? LEVELS[0];

/**
 * A donut chart with dithered segments. Each segment gets its own dither
 * density (and optionally its own colour), the total sits in the centre,
 * and hovering a segment or legend row brings it forward.
 */
export const DonutChart = ({
  data,
  label,
  size = 200,
  thickness,
  unit = "",
  format = { maximumFractionDigits: 0 },
  legend = true,
  color = "--dither-ink",
  matrix = "bayer4",
  cell,
  className,
  ...props
}: DonutChartProps) => {
  const ref = useRef<HTMLElement>(null);
  const cellSize = useCellSize(ref, cell);
  const prefix = `donut${useId().replaceAll(/[^a-zA-Z0-9]/g, "")}`;
  const [active, setActive] = useState<number | null>(null);

  const formatter = new Intl.NumberFormat("en-US", format);
  const percent = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    style: "percent",
  });
  const values = data.map(({ value }) => Math.max(0, value));
  const total = values.reduce((sum, value) => sum + value, 0);

  const ring = Math.max(cellSize * 2, thickness ?? Math.round(size * 0.15));
  const radius = size / 2 - ring / 2;
  const circumference = 2 * Math.PI * radius;
  const shown = values.filter((value) => value > 0).length;
  const gap = shown > 1 ? GAP_PX : 0;

  let offset = 0;
  const segments = data.map((segment, index) => {
    const value = values[index] ?? 0;
    const share = total > 0 ? value / total : 0;
    const length = share * circumference;
    const start = offset;
    offset += length;
    return {
      ...segment,
      dash: Math.max(0, length - gap),
      index,
      level: segment.level ?? levelAt(index),
      share,
      start: start + gap / 2,
      value,
    };
  });

  const focus = active === null ? null : segments[active];
  const centreValue = focus ? focus.value : total;
  const centreLabel = focus ? focus.label : label;

  return (
    <figure
      ref={ref}
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-10 gap-y-6",
        className
      )}
      {...props}
    >
      <div className="relative shrink-0" style={{ height: size, width: size }}>
        <svg
          aria-hidden
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="block -rotate-90"
          onPointerLeave={() => setActive(null)}
        >
          <defs>
            {segments.map((segment) => (
              <DitherPattern
                key={segment.index}
                id={`${prefix}-${segment.index}`}
                level={segment.level}
                matrix={matrix}
                cell={cellSize}
                color={segment.color ?? color}
              />
            ))}
          </defs>
          {segments.map((segment) =>
            segment.dash > 0 ? (
              <circle
                key={segment.index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={`url(#${prefix}-${segment.index})`}
                strokeWidth={ring}
                strokeDasharray={`${segment.dash} ${circumference}`}
                strokeDashoffset={-segment.start}
                onPointerEnter={() => setActive(segment.index)}
                className={cn(
                  "transition-[stroke-dasharray,opacity] motion-reduce:transition-none",
                  "starting:[stroke-dasharray:0_9999]",
                  active !== null && active !== segment.index && "opacity-30"
                )}
                style={{
                  transitionDelay: `${segment.index * 60}ms`,
                  transitionDuration: `${MOTION.slow}ms, ${MOTION.fast}ms`,
                  transitionTimingFunction: MOTION.ease,
                }}
              />
            ) : null
          )}
        </svg>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        >
          <span
            className="text-foreground leading-none font-semibold tracking-tight tabular-nums"
            style={{ fontSize: Math.round(size * 0.13) }}
          >
            {formatter.format(centreValue)}
            {unit}
          </span>
          <span className="text-muted-foreground mt-1.5 max-w-full truncate text-xs">
            {centreLabel}
          </span>
        </div>
      </div>
      <figcaption className="sr-only">
        {label}: {formatter.format(total)}
        {unit} in total.
      </figcaption>
      <ul
        className={cn(
          "flex min-w-48 flex-col gap-1 text-sm",
          !legend && "sr-only"
        )}
        onPointerLeave={() => setActive(null)}
      >
        {segments.map((segment) => (
          <li
            key={segment.index}
            onPointerEnter={() => setActive(segment.index)}
            className={cn(
              "-mx-2 flex items-center gap-3 rounded-md px-2 py-1 transition-opacity motion-reduce:transition-none",
              active !== null && active !== segment.index && "opacity-45"
            )}
            style={{ transitionDuration: `${MOTION.fast}ms` }}
          >
            <svg aria-hidden width={12} height={12} className="shrink-0">
              <rect
                width={12}
                height={12}
                fill={`url(#${prefix}-${segment.index})`}
              />
              <rect
                x={0.5}
                y={0.5}
                width={11}
                height={11}
                fill="none"
                stroke={cssColor(segment.color ?? color)}
                strokeOpacity={0.4}
              />
            </svg>
            <span className="text-foreground min-w-0 flex-1 truncate">
              {segment.label}
            </span>
            <span className="text-foreground font-mono text-xs tabular-nums">
              {formatter.format(segment.value)}
              {unit}
            </span>
            <span className="text-muted-foreground w-12 text-right font-mono text-xs tabular-nums">
              {percent.format(segment.share)}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
};
