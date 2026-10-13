"use client";

import { useId, useRef, useSyncExternalStore } from "react";
import type { ComponentProps, CSSProperties, RefObject } from "react";

import {
  cssColor,
  DitherPattern,
  ditherMaskStyle,
  MOTION,
  readDitherCell,
  subscribeToTheme,
  useFrameLoop,
} from "@/lib/dither";
import type { DitherColor, DitherMatrix } from "@/lib/dither";
import { cn } from "@/lib/utils";

export type ProgressBarSize = "sm" | "md" | "lg";

export type ProgressBarProps = Omit<ComponentProps<"div">, "children"> & {
  /** What is in progress. Shown above the bar and used as its accessible name. */
  label: string;
  /** Progress from 0 to `max`. Leave it out for an indeterminate bar. */
  value?: number | null;
  /** The value that means done. Default 100. */
  max?: number;
  /** Text for the readout and screen readers. Default: the percentage. */
  valueText?: string;
  /** Keep the label for screen readers only. Default false. */
  hideLabel?: boolean;
  /** Bar height: 2, 4 or 8 cells. Default `"md"`. */
  size?: ProgressBarSize;
  /** Ink colour. Default `--dither-ink`. */
  color?: DitherColor;
  /** Threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Cell size in CSS pixels. Default `--dither-cell`. */
  cell?: number;
};

const ROWS = { lg: 8, md: 4, sm: 2 } as const satisfies Record<
  ProgressBarSize,
  number
>;

/** Faint dots under the fill, so the empty part of the track still reads. */
const TRACK_LEVEL = 2 / 16;
/** The body of the fill, then a head that gets denser toward the value. */
const BODY_LEVEL = 8 / 16;
const HEAD_LEVELS = [11 / 16, 14 / 16, 1] as const;

/** Indeterminate band: columns across the track and the sweep time. */
const COLUMNS = Array.from({ length: 48 }, (_, index) => index);
const SWEEP_SECONDS = 1.8;
const BAND_HALF_WIDTH = 0.16;
const STEPS = 16;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const easeInOut = (value: number) =>
  value < 0.5 ? 2 * value * value : 1 - (-2 * value + 2) ** 2 / 2;

/** Ink level (in sixteenths) of one column, for a band centred at `centre`. */
const bandStep = (column: number, centre: number) => {
  const x = (column + 0.5) / COLUMNS.length;
  const distance = Math.abs(x - centre) / BAND_HALF_WIDTH;
  const tone = clamp01(1 - distance) ** 1.6;
  return Math.max(2, Math.round(tone * STEPS));
};

/** `cell`, or `--dither-cell` as it applies to the element. 3 on the server. */
const useCellSize = (ref: RefObject<Element | null>, cell?: number) =>
  useSyncExternalStore(
    subscribeToTheme,
    () => cell ?? readDitherCell(ref.current),
    () => cell ?? 3
  );

const IndeterminateFill = ({
  color,
  matrix,
  cell,
}: {
  color: DitherColor;
  matrix: DitherMatrix;
  cell?: number;
}) => {
  const ref = useRef<SVGSVGElement>(null);
  const cellSize = useCellSize(ref, cell);
  const rects = useRef<(SVGRectElement | null)[]>([]);
  const drawn = useRef<number[]>([]);
  const prefix = `pb${useId().replaceAll(/[^a-zA-Z0-9]/g, "")}`;

  useFrameLoop(
    (time, delta) => {
      // The still frame (reduced motion) holds the band in the middle.
      const phase = (time / SWEEP_SECONDS) % 1;
      const centre =
        delta === 0 ? 0.5 : -BAND_HALF_WIDTH + easeInOut(phase) * 1.32;
      for (const column of COLUMNS) {
        const step = bandStep(column, centre);
        const rect = rects.current[column];
        if (rect && drawn.current[column] !== step) {
          drawn.current[column] = step;
          rect.setAttribute("fill", `url(#${prefix}-${step})`);
        }
      }
    },
    { target: ref }
  );

  return (
    <svg ref={ref} aria-hidden className="absolute inset-0 size-full">
      <defs>
        {Array.from({ length: STEPS - 1 }, (_, index) => index + 2).map(
          (step) => (
            <DitherPattern
              key={step}
              id={`${prefix}-${step}`}
              level={step / STEPS}
              matrix={matrix}
              cell={cellSize}
              color={color}
            />
          )
        )}
      </defs>
      {COLUMNS.map((column) => (
        <rect
          key={column}
          ref={(node) => {
            rects.current[column] = node;
          }}
          x={`${(column / COLUMNS.length) * 100}%`}
          width={`${(1 / COLUMNS.length) * 100 + 0.1}%`}
          height="100%"
          fill={`url(#${prefix}-2)`}
        />
      ))}
    </svg>
  );
};

/**
 * A linear progress bar with a dithered fill. With a `value` the fill
 * grows to it and its head gets denser toward the edge; without one the bar
 * is indeterminate and a band of ink sweeps across, cell by cell.
 */
export const ProgressBar = ({
  label,
  value,
  max = 100,
  valueText,
  hideLabel = false,
  size = "md",
  color = "--dither-ink",
  matrix = "bayer4",
  cell,
  className,
  style,
  ...props
}: ProgressBarProps) => {
  const labelId = useId();
  const determinate = typeof value === "number";
  const ratio = determinate ? clamp01(value / Math.max(max, 1e-9)) : 0;
  const readout = valueText ?? `${Math.round(ratio * 100)}%`;
  const cellLength = cell === undefined ? "var(--dither-cell)" : `${cell}px`;
  const ink = cssColor(color);
  const fillStyle: CSSProperties = {
    transitionDuration: `${MOTION.slow}ms`,
    transitionTimingFunction: MOTION.ease,
    width: `${ratio * 100}%`,
  };

  return (
    <div
      role="progressbar"
      aria-labelledby={labelId}
      aria-valuemin={0}
      aria-valuemax={determinate ? max : undefined}
      aria-valuenow={
        determinate ? Math.min(max, Math.max(0, value)) : undefined
      }
      aria-valuetext={determinate ? readout : valueText}
      className={cn("flex w-full flex-col gap-2", className)}
      style={style}
      {...props}
    >
      <div
        className={cn(
          "flex items-baseline justify-between gap-4 text-sm",
          hideLabel && "sr-only"
        )}
      >
        <span id={labelId} className="text-foreground truncate">
          {label}
        </span>
        {determinate || valueText ? (
          <span
            aria-hidden
            className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums"
          >
            {readout}
          </span>
        ) : null}
      </div>
      <div
        aria-hidden
        className="relative w-full overflow-hidden"
        style={{ height: `calc(${cellLength} * ${ROWS[size]})` }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: ink,
            ...ditherMaskStyle(TRACK_LEVEL, { cell: cellLength, matrix }),
          }}
        />
        {determinate ? (
          <div
            className="absolute inset-y-0 left-0 flex justify-end overflow-hidden transition-[width] motion-reduce:transition-none starting:w-0"
            style={fillStyle}
          >
            <div
              className="h-full min-w-0 flex-1"
              style={{
                backgroundColor: ink,
                ...ditherMaskStyle(BODY_LEVEL, { cell: cellLength, matrix }),
              }}
            />
            {HEAD_LEVELS.map((level) => (
              <div
                key={level}
                className="h-full shrink-0"
                style={{
                  backgroundColor: ink,
                  width: `calc(${cellLength} * 4)`,
                  ...ditherMaskStyle(level, { cell: cellLength, matrix }),
                }}
              />
            ))}
          </div>
        ) : (
          <IndeterminateFill color={color} matrix={matrix} cell={cell} />
        )}
      </div>
    </div>
  );
};
