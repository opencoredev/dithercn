"use client";

import type { ComponentProps } from "react";

import {
  CartesianChart,
  chartSummary,
  linearPath,
  monotonePath,
  niceScale,
  quantizeLevel,
  readValue,
  seriesColor,
  seriesMatrix,
  toFormatter,
} from "@/components/dithercn/cartesian-chart";
import type {
  Accessor,
  ChartContext,
  ChartSeries,
  NonEmpty,
  ValueFormat,
} from "@/components/dithercn/cartesian-chart";
import { cssColor, DitherPattern } from "@/lib/dither";
import type { DitherColor, DitherMatrix } from "@/lib/dither";

export type {
  Accessor,
  ValueFormat,
} from "@/components/dithercn/cartesian-chart";

export interface LineSeries<T> extends ChartSeries<T> {
  /**
   * A range drawn as a dithered band around the line, such as p10 to p90
   * or a forecast interval. Both ends are keys of `T` or functions.
   */
  range?: {
    low: Accessor<T, number>;
    high: Accessor<T, number>;
    /** Band colour. Default: the line's. */
    color?: DitherColor;
  };
  /** Draw the line dashed, for a previous period or a target. */
  dashed?: boolean;
}

export interface LineChartProps<T> extends Omit<
  ComponentProps<"div">,
  "children"
> {
  /** One entry per point along the x axis, in order. */
  data: readonly T[];
  /** Key (or function) for the x axis label, such as a date or month. */
  x: Accessor<T, string | number>;
  /** One or more lines, each with an optional range band. */
  series: NonEmpty<LineSeries<T>>;
  /** Point markers: on every point, on the `last` only, or `none`. Default `last`. */
  markers?: "all" | "last" | "none";
  /** Start the value axis at zero. Default false: it fits the data. */
  zero?: boolean;
  /** Height in px, axes included. Default 240. */
  height?: number;
  /** `smooth` (monotone, never overshoots) or `linear`. Default `smooth`. */
  curve?: "smooth" | "linear";
  /** Coverage of the range bands, 0 to 1. Default 0.25. */
  level?: number;
  /** Threshold matrix of the first series' band. Default `bayer4`. */
  matrix?: DitherMatrix;
  /** Dither cell in px. Default `--dither-cell`. */
  cell?: number;
  /** Show the y and x axes. Default true. */
  axes?: boolean;
  /** Show the hover and keyboard readout. Default true. */
  tooltip?: boolean;
  /** Show a legend. Default: when there are two or more series. */
  legend?: boolean;
  /**
   * How values are written on the axis, in the readout and in the table:
   * `Intl.NumberFormat` options or a function. Default compact (1.2K).
   */
  format?: ValueFormat;
}

const Swatch = ({ color, dashed }: { color: DitherColor; dashed: boolean }) => (
  <svg aria-hidden="true" width={14} height={10} className="shrink-0">
    <line
      x1={1}
      x2={13}
      y1={5}
      y2={5}
      stroke={cssColor(color)}
      strokeWidth={2}
      strokeLinecap="round"
      strokeDasharray={dashed ? "3 3" : undefined}
    />
  </svg>
);

const markedPoints = <P,>(
  points: readonly P[],
  markers: NonNullable<LineChartProps<unknown>["markers"]>
): readonly P[] => {
  switch (markers) {
    case "all": {
      return points;
    }
    case "last": {
      return points.slice(-1);
    }
    case "none": {
      return [];
    }
    default: {
      const exhaustive: never = markers;
      return exhaustive;
    }
  }
};

/** The same path drawn backwards, minus its opening move, to close a band. */
const reversed = (path: string) => path.replace(/^M/u, "L");

/**
 * A line chart: one or more crisp lines, each with an optional dithered
 * range band and point markers. Hover or focus it for a readout.
 */
export const LineChart = <T,>({
  data,
  x,
  series,
  markers = "last",
  zero = false,
  height = 240,
  curve = "smooth",
  level = 0.25,
  matrix = "bayer4",
  cell,
  axes = true,
  tooltip = true,
  legend,
  format,
  ...props
}: LineChartProps<T>) => {
  const toPath = curve === "smooth" ? monotonePath : linearPath;
  const formatValue = toFormatter(format);
  const scale = niceScale(
    series.flatMap((entry) =>
      data.flatMap((datum) => {
        const value = readValue(datum, entry.value);
        return entry.range === undefined
          ? [value]
          : [
              value,
              readValue(datum, entry.range.low),
              readValue(datum, entry.range.high),
            ];
      })
    ),
    { zero }
  );
  const summary = chartSummary({ data, kind: "Line chart", series, x });

  const readout = (datum: T) =>
    series.map((entry, index) => {
      const value = formatValue(readValue(datum, entry.value));
      const range =
        entry.range === undefined
          ? ""
          : ` (${formatValue(readValue(datum, entry.range.low))}–${formatValue(readValue(datum, entry.range.high))})`;
      return {
        color: seriesColor(entry.color, index),
        label: entry.label,
        value: `${value}${range}`,
      };
    });

  const marks = ({ uid, cell: px, xAt, yAt, active, reveal }: ChartContext) => {
    const lines = series.map((entry, seriesIndex) => {
      const pointAt = (accessor: Accessor<T, number>) =>
        data.map((datum, index) => ({
          x: xAt(index),
          y: yAt(readValue(datum, accessor)),
        }));
      const { range } = entry;
      const band =
        range === undefined
          ? null
          : `${toPath(pointAt(range.high))}${reversed(toPath(pointAt(range.low).toReversed()))}Z`;
      const color = seriesColor(entry.color, seriesIndex);
      return {
        band,
        bandColor: range?.color ?? color,
        color,
        dashed: entry.dashed === true,
        id: `${uid}-line-${seriesIndex}`,
        key: entry.label,
        points: pointAt(entry.value),
        seriesIndex,
      };
    });

    return (
      <>
        {lines.map(({ band, bandColor, id, key, seriesIndex }) =>
          band === null ? null : (
            <g key={key}>
              <defs>
                <DitherPattern
                  id={`${id}-band`}
                  level={quantizeLevel(level * reveal)}
                  matrix={seriesMatrix(matrix, seriesIndex)}
                  cell={px}
                  color={bandColor}
                />
              </defs>
              <path
                d={band}
                fill={`url(#${id}-band)`}
                shapeRendering="crispEdges"
              />
            </g>
          )
        )}
        {lines.map(({ color, dashed, key, points }) => {
          const ink = cssColor(color);
          const marked = markedPoints(points, markers);
          const activePoint = active === null ? undefined : points[active];
          return (
            <g key={key}>
              {dashed ? (
                <path
                  d={toPath(points)}
                  fill="none"
                  stroke={ink}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray="4 5"
                  className="ease-(--ease-out) transition-opacity duration-700 motion-reduce:transition-none starting:opacity-0"
                />
              ) : (
                <path
                  d={toPath(points)}
                  pathLength={1}
                  fill="none"
                  stroke={ink}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={1}
                  className="ease-(--ease-out) [stroke-dashoffset:0] transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none starting:[stroke-dashoffset:1]"
                />
              )}
              {marked.map((point) => (
                <circle
                  key={point.x}
                  cx={point.x}
                  cy={point.y}
                  r={3.5}
                  fill={ink}
                  stroke="var(--dither-paper)"
                  strokeWidth={2}
                  className="ease-(--ease-out) transition-opacity delay-500 duration-300 motion-reduce:transition-none starting:opacity-0"
                />
              ))}
              {activePoint === undefined ? null : (
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r={4.5}
                  fill={ink}
                  stroke="var(--dither-paper)"
                  strokeWidth={2}
                />
              )}
            </g>
          );
        })}
      </>
    );
  };

  return (
    <CartesianChart
      {...props}
      data={data}
      x={x}
      series={series}
      scale={scale}
      layout="point"
      height={height}
      axes={axes}
      tooltip={tooltip}
      legend={legend ?? series.length > 1}
      cell={cell}
      formatValue={formatValue}
      readout={readout}
      swatch={(index, color) => (
        <Swatch color={color} dashed={series[index]?.dashed === true} />
      )}
      crosshair
      summary={summary}
    >
      {marks}
    </CartesianChart>
  );
};
