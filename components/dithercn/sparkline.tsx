"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ComponentProps } from "react";

import { cssColor, DitherPattern, readDitherCell } from "@/lib/dither";
import type { DitherColor, DitherMatrix } from "@/lib/dither";
import { cn } from "@/lib/utils";

export interface SparklineProps extends Omit<
  ComponentProps<"span">,
  "children"
> {
  /** Values in order, oldest first. */
  data: readonly number[];
  /** What the trend shows, such as "Revenue, last 30 days". Starts the accessible summary. */
  label: string;
  /** Height in px. Default 32. The width follows the element, so size it with `className`. */
  height?: number;
  /** Ink colour. Default `--dither-ink`. */
  color?: DitherColor;
  /** Fill under the line. Default true. */
  area?: boolean;
  /** Dot on the latest value. Default true. */
  dot?: boolean;
  /** Coverage of the fill just under the line, 0 to 1. Default 0.5. */
  level?: number;
  /** Threshold matrix. Default `bayer4`. */
  matrix?: DitherMatrix;
  /** Dither cell in px. Default 2, a step finer than `--dither-cell`. */
  cell?: number;
  /** Formats values in the accessible summary. Default compact (1.2K). */
  format?: Intl.NumberFormatOptions;
}

const STROKE = 1.5;
const DOT = 2.5;

/** Snap a length to whole device pixels so dither cells stay sharp. */
const snapToDevice = (px: number) => {
  const dpr = window.devicePixelRatio || 1;
  return Math.max(1, Math.round(px * dpr)) / dpr;
};

const useWidth = (ref: { current: HTMLElement | null }) => {
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setWidth(Math.floor(entry.contentRect.width));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
};

/**
 * A tiny trend line for tables and stat cards: a line, a dithered fill
 * that is densest just under it, and a dot on the latest value. Its
 * accessible name summarises the trend in words.
 */
export const Sparkline = ({
  data,
  label,
  height = 32,
  color = "--dither-ink",
  area = true,
  dot = true,
  level = 0.5,
  matrix = "bayer4",
  cell,
  format = { maximumFractionDigits: 1, notation: "compact" },
  className,
  style,
  ...props
}: SparklineProps) => {
  const uid = useId().replaceAll(":", "");
  const ref = useRef<HTMLSpanElement>(null);
  const width = useWidth(ref);
  const [px, setPx] = useState(2);

  useEffect(() => {
    setPx(snapToDevice(cell ?? Math.max(1, readDitherCell(ref.current) - 1)));
  }, [cell]);

  const numbers = new Intl.NumberFormat("en", format);
  const [first] = data;
  const last = data.at(-1);
  const low = Math.min(...data);
  const high = Math.max(...data);
  const summary =
    first === undefined || last === undefined
      ? `${label}: no data`
      : `${label}: ${numbers.format(first)} to ${numbers.format(last)}, low ${numbers.format(low)}, high ${numbers.format(high)}`;

  const ink = cssColor(color);
  // Leave room for the stroke and the dot so neither is clipped.
  const inset = (dot ? DOT : 0) + STROKE;
  const span = high - low || 1;
  const points =
    width === null
      ? []
      : data.map((value, index) => ({
          x:
            data.length === 1
              ? width / 2
              : inset + (index / (data.length - 1)) * (width - inset * 2),
          y: inset + (1 - (value - low) / span) * (height - inset * 2),
        }));
  const line = points
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x} ${y}`)
    .join("");
  const [start] = points;
  const end = points.at(-1);
  const fill =
    start === undefined || end === undefined
      ? ""
      : `${line}L${end.x} ${height}L${start.x} ${height}Z`;

  return (
    <span
      {...props}
      ref={ref}
      role="img"
      aria-label={summary}
      className={cn("inline-block w-full align-middle", className)}
      style={{ height, ...style }}
    >
      {width === null || end === undefined ? null : (
        <svg
          aria-hidden="true"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block overflow-visible"
        >
          {area ? (
            <>
              <defs>
                <DitherPattern
                  id={`${uid}-low`}
                  level={Math.round(level * 8) / 16}
                  matrix={matrix}
                  cell={px}
                  color={color}
                />
                <DitherPattern
                  id={`${uid}-high`}
                  level={Math.round(level * 16) / 16}
                  matrix={matrix}
                  cell={px}
                  color={color}
                />
                <mask id={`${uid}-near`}>
                  <rect width={width} height={height} fill="white" />
                  <path
                    d={fill}
                    transform={`translate(0 ${Math.max(px * 2, height * 0.3)})`}
                    fill="black"
                    shapeRendering="crispEdges"
                  />
                </mask>
              </defs>
              <g className="ease-(--ease-out) transition-opacity duration-500 motion-reduce:transition-none starting:opacity-0">
                <path
                  d={fill}
                  fill={`url(#${uid}-low)`}
                  shapeRendering="crispEdges"
                />
                <path
                  d={fill}
                  fill={`url(#${uid}-high)`}
                  mask={`url(#${uid}-near)`}
                  shapeRendering="crispEdges"
                />
              </g>
            </>
          ) : null}
          <path
            d={line}
            pathLength={1}
            fill="none"
            stroke={ink}
            strokeWidth={STROKE}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={1}
            className="ease-(--ease-out) [stroke-dashoffset:0] transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none starting:[stroke-dashoffset:1]"
          />
          {dot ? (
            <circle
              cx={end.x}
              cy={end.y}
              r={DOT}
              fill={ink}
              stroke="var(--dither-paper)"
              strokeWidth={1.5}
              className="ease-(--ease-out) transition-opacity delay-500 duration-300 motion-reduce:transition-none starting:opacity-0"
            />
          ) : null}
        </svg>
      )}
    </span>
  );
};
