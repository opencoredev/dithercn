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
  ChartSeries,
  ValueFormat,
} from "@/components/dithercn/cartesian-chart";

export interface AreaChartProps<T> extends Omit<
  ComponentProps<"div">,
  "children"
> {
  /** One entry per point along the x axis, in order. */
  data: readonly T[];
  /** Key (or function) for the x axis label, such as a date or month. */
  x: Accessor<T, string | number>;
  /** One or more series. Later series draw on top. */
  series: NonEmpty<ChartSeries<T>>;
  /** Height in px, axes included. Default 240. */
  height?: number;
  /**
   * `density`: the fill is densest just under the line and thins toward
   * the baseline. `flat`: one even level. Default `density`.
   */
  fill?: "density" | "flat";
  /** Coverage of the densest fill, 0 to 1. Default 0.5. */
  level?: number;
  /** `smooth` (monotone, never overshoots) or `linear`. Default `smooth`. */
  curve?: "smooth" | "linear";
  /** Threshold matrix of the first series. Default `bayer4`. */
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

// Share of the plot height each density band reaches below the line, and
// its coverage relative to `level`. Bands overlap: a Bayer level always
// contains the cells of every lower level, so the union reads as a ramp.
const DENSITY_BANDS = [
  { depth: Number.POSITIVE_INFINITY, share: 0.25 },
  { depth: 0.62, share: 0.375 },
  { depth: 0.42, share: 0.5 },
  { depth: 0.27, share: 0.625 },
  { depth: 0.15, share: 0.75 },
  { depth: 0.06, share: 1 },
] as const;
const FLAT_BANDS = [{ depth: Number.POSITIVE_INFINITY, share: 1 }] as const;

const Swatch = ({ color }: { color: DitherColor }) => (
  <svg aria-hidden="true" width={12} height={10} className="shrink-0">
    <rect y={4} width={12} height={6} fill={cssColor(color)} opacity={0.35} />
    <rect width={12} height={2} fill={cssColor(color)} />
  </svg>
);

/**
 * An area chart: each series is a crisp line over a dithered fill. By
 * default the fill is densest under the line and thins toward the axis.
 * Hover or focus it for a readout; the data is also in a hidden table.
 */
export const AreaChart = <T,>({
  data,
  x,
  series,
  height = 240,
  fill = "density",
  level = 0.5,
  curve = "smooth",
  matrix = "bayer4",
  cell,
  axes = true,
  tooltip = true,
  legend,
  format,
  ...props
}: AreaChartProps<T>) => {
  const scale = niceScale(
    series.flatMap((entry) =>
      data.map((datum) => readValue(datum, entry.value))
    )
  );
  const bands = fill === "density" ? DENSITY_BANDS : FLAT_BANDS;
  const toPath = curve === "smooth" ? monotonePath : linearPath;
  const summary = chartSummary({ data, kind: "Area chart", series, x });

  const marks = ({
    uid,
    cell: px,
    plot,
    xAt,
    yAt,
    active,
    reveal,
  }: ChartContext) => {
    const baseline = yAt(Math.max(scale.min, 0));
    const plotHeight = plot.bottom - plot.top;
    const shapes = series.map((entry, seriesIndex) => {
      const points = data.map((datum, index) => ({
        x: xAt(index),
        y: yAt(readValue(datum, entry.value)),
      }));
      const line = toPath(points);
      const [first] = points;
      const last = points.at(-1);
      const area =
        first === undefined || last === undefined
          ? ""
          : `${line}L${last.x} ${baseline}L${first.x} ${baseline}Z`;
      return {
        area,
        color: seriesColor(entry.color, seriesIndex),
        id: `${uid}-area-${seriesIndex}`,
        key: entry.label,
        line,
        points,
        seriesIndex,
      };
    });

    return (
      <>
        {shapes.map(({ area, color, id, key, seriesIndex }) => (
          <g key={key}>
            <defs>
              {bands.map((band, bandIndex) => (
                <DitherPattern
                  key={band.depth}
                  id={`${id}-p${bandIndex}`}
                  level={quantizeLevel(level * band.share * reveal)}
                  matrix={seriesMatrix(matrix, seriesIndex)}
                  cell={px}
                  color={color}
                />
              ))}
              {bands.map((band, bandIndex) =>
                Number.isFinite(band.depth) ? (
                  <mask key={band.depth} id={`${id}-m${bandIndex}`}>
                    <rect
                      x={plot.left}
                      y={plot.top - 4}
                      width={plot.right - plot.left}
                      height={plotHeight + 8}
                      fill="white"
                    />
                    <path
                      d={area}
                      transform={`translate(0 ${Math.max(px * 2, band.depth * plotHeight)})`}
                      fill="black"
                      shapeRendering="crispEdges"
                    />
                  </mask>
                ) : null
              )}
            </defs>
            {seriesIndex > 0 ? (
              // Knock out the fills behind, so each area shows one texture.
              <path d={area} fill="var(--dither-paper)" />
            ) : null}
            {bands.map((band, bandIndex) => (
              <path
                key={band.depth}
                d={area}
                fill={`url(#${id}-p${bandIndex})`}
                mask={
                  Number.isFinite(band.depth)
                    ? `url(#${id}-m${bandIndex})`
                    : undefined
                }
                shapeRendering="crispEdges"
              />
            ))}
          </g>
        ))}
        {shapes.map(({ color, key, line, points }) => {
          const activePoint = active === null ? undefined : points[active];
          return (
            <g key={key}>
              <path
                d={line}
                pathLength={1}
                fill="none"
                stroke={cssColor(color)}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={1}
                className="ease-(--ease-out) [stroke-dashoffset:0] transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none starting:[stroke-dashoffset:1]"
              />
              {activePoint === undefined ? null : (
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r={4}
                  fill={cssColor(color)}
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
      formatValue={toFormatter(format)}
      swatch={(_, color) => <Swatch color={color} />}
      crosshair
      summary={summary}
    >
      {marks}
    </CartesianChart>
  );
};
