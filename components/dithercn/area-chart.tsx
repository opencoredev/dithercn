"use client";

import { useMemo } from "react";
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
  toFormatter,
} from "@/components/dithercn/cartesian-chart";
import type {
  Accessor,
  ChartContext,
  ChartSeries,
  ChartStyleProps,
  NonEmpty,
  Point,
  Scale,
  ValueFormat,
} from "@/components/dithercn/cartesian-chart";
import { BloomGroup, cssColor, DitherPattern, FillPattern } from "@/lib/dither";
import type { DitherColor, DitherMatrix } from "@/lib/dither";

export type {
  Accessor,
  ChartSeries,
  ValueFormat,
} from "@/components/dithercn/cartesian-chart";

/** How several series combine. */
export type AreaStack = "none" | "stacked" | "percent";

export interface AreaChartProps<T>
  extends Omit<ComponentProps<"div">, "children">, ChartStyleProps {
  /** One entry per point along the x axis, in order. */
  data: readonly T[];
  /** Key (or function) for the x axis label, such as a date or month. */
  x: Accessor<T, string | number>;
  /** One or more series. Later series draw on top. */
  series: NonEmpty<ChartSeries<T>>;
  /**
   * `none`: series overlap, each from the baseline. `stacked`: each sits on
   * the ones before it. `percent`: stacked and scaled to 100%. Default `none`.
   */
  stack?: AreaStack;
  /** Height in px, axes included. Default 240. */
  height?: number;
  /** Gradient only: coverage of the densest band, just under the line, 0 to 1. Default 0.625. */
  level?: number;
  /** `smooth` (monotone, never overshoots) or `linear`. Default `smooth`. */
  curve?: "smooth" | "linear";
  /** Gradient only: threshold matrix. Default `bayer4`. */
  matrix?: DitherMatrix;
  /** Dither cell in px. Default `--dither-cell`. */
  cell?: number;
  /** Show the y and x axes. Default true. */
  axes?: boolean;
  /** Show the readout while scrubbing. Default true. */
  tooltip?: boolean;
  /** Show the legend. Default: when there are two or more series. */
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
  { depth: Number.POSITIVE_INFINITY, share: 0.2 },
  { depth: 0.6, share: 0.35 },
  { depth: 0.4, share: 0.5 },
  { depth: 0.25, share: 0.65 },
  { depth: 0.13, share: 0.8 },
  { depth: 0.05, share: 1 },
] as const;

const PERCENT_SCALE: Scale = { max: 100, min: 0, ticks: [0, 25, 50, 75, 100] };
const formatPercent = (value: number) => `${Math.round(value)}%`;

const Swatch = ({ color }: { color: DitherColor }) => (
  <svg aria-hidden="true" width={10} height={10} className="shrink-0">
    <rect y={3} width={10} height={7} fill={cssColor(color)} opacity={0.4} />
    <rect width={10} height={2} fill={cssColor(color)} />
  </svg>
);

/** Each series' top and bottom edge at every datum, in data units. */
const stackValues = (
  values: readonly (readonly number[])[],
  stack: AreaStack
) => {
  const count = values[0]?.length ?? 0;
  const totals = Array.from({ length: count }, (_, index) =>
    values.reduce((sum, row) => sum + Math.max(0, row[index] ?? 0), 0)
  );
  const running = Array.from({ length: count }, () => 0);
  return values.map((row) =>
    row.map((raw, index) => {
      if (stack === "none") {
        return { high: raw, low: 0 };
      }
      const value = Math.max(0, raw);
      const scaled =
        stack === "percent" ? (value / (totals[index] || 1)) * 100 : value;
      const low = running[index] ?? 0;
      running[index] = low + scaled;
      return { high: low + scaled, low };
    })
  );
};

/** The same path drawn backwards, minus its opening move, to close a shape. */
const continuePath = (path: string) => path.replace(/^M/u, "L");

/**
 * An area chart: each series is a crisp line over a dithered fill. The
 * default `gradient` fill is densest under the line and thins toward the
 * axis. Scrub it with the pointer or the arrow keys for a readout, and
 * spotlight a series from the legend. The data is also in a hidden table.
 */
export const AreaChart = <T,>({
  data,
  x,
  series,
  stack = "none",
  height = 240,
  fill = "gradient",
  bloom = "off",
  colors,
  level = 0.625,
  curve = "smooth",
  matrix = "bayer4",
  cell,
  axes = true,
  tooltip = true,
  legend,
  interactive = true,
  animate = true,
  format,
  ...props
}: AreaChartProps<T>) => {
  const formatValue = useMemo(() => toFormatter(format), [format]);
  const { edges, raw, scale } = useMemo(() => {
    const values = series.map((entry) =>
      data.map((datum) => readValue(datum, entry.value))
    );
    const stacked = stackValues(values, stack);
    return {
      edges: stacked,
      raw: values,
      scale:
        stack === "percent"
          ? PERCENT_SCALE
          : niceScale(stacked.flatMap((row) => row.map((edge) => edge.high))),
    };
  }, [data, series, stack]);
  const toPath = curve === "smooth" ? monotonePath : linearPath;
  const summary = chartSummary({
    data,
    kind: stack === "none" ? "Area chart" : "Stacked area chart",
    series,
    x,
  });

  const readout = useMemo(() => {
    if (stack !== "percent") {
      return;
    }
    return (datum: T) => {
      const index = data.indexOf(datum);
      return series.map((entry, seriesIndex) => {
        const edge = edges[seriesIndex]?.[index];
        const share = edge === undefined ? 0 : edge.high - edge.low;
        return {
          color: seriesColor(entry.color, seriesIndex, colors),
          label: entry.label,
          value: `${formatValue(raw[seriesIndex]?.[index] ?? 0)} · ${formatPercent(share)}`,
        };
      });
    };
  }, [stack, data, series, edges, raw, colors, formatValue]);

  const marks = ({
    uid,
    cell: px,
    plot,
    xAt,
    yAt,
    reveal,
    animate: motion,
    colorOf,
    opacityOf,
  }: ChartContext) => {
    const baseline = yAt(Math.max(scale.min, 0));
    const plotHeight = plot.bottom - plot.top;
    const shapes = series.map((entry, seriesIndex) => {
      const row = edges[seriesIndex] ?? [];
      const top: Point[] = row.map((edge, index) => ({
        x: xAt(index),
        y: yAt(edge.high),
      }));
      const line = toPath(top);
      const [first] = top;
      const last = top.at(-1);
      let area = "";
      if (first !== undefined && last !== undefined) {
        area =
          stack === "none"
            ? `${line}L${last.x} ${baseline}L${first.x} ${baseline}Z`
            : `${line}${continuePath(toPath(row.map((edge, index) => ({ x: xAt(index), y: yAt(edge.low) })).toReversed()))}Z`;
      }
      return {
        area,
        color: colorOf(seriesIndex),
        id: `${uid}-area-${seriesIndex}`,
        key: entry.label,
        line,
        seriesIndex,
      };
    });

    return (
      <>
        <BloomGroup bloom={bloom}>
          {shapes.map(({ area, color, key, seriesIndex }) => (
            <path
              key={key}
              d={area}
              fill={cssColor(color)}
              opacity={opacityOf(seriesIndex)}
            />
          ))}
        </BloomGroup>
        {shapes.map(({ area, color, id, key, seriesIndex }) => (
          <g key={key}>
            {stack === "none" && seriesIndex > 0 ? (
              // Knock out the fills behind, so each area shows one texture.
              <path d={area} fill="var(--dither-paper)" />
            ) : null}
            <g
              opacity={opacityOf(seriesIndex)}
              className="transition-opacity duration-200 ease-out motion-reduce:transition-none"
            >
              {fill === "gradient" ? (
                <>
                  <defs>
                    {DENSITY_BANDS.map((band, bandIndex) => (
                      <DitherPattern
                        key={band.depth}
                        id={`${id}-p${bandIndex}`}
                        level={quantizeLevel(level * band.share * reveal)}
                        matrix={matrix}
                        cell={px}
                        color={color}
                      />
                    ))}
                    {DENSITY_BANDS.map((band, bandIndex) =>
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
                  {DENSITY_BANDS.map((band, bandIndex) => (
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
                </>
              ) : (
                <>
                  <defs>
                    <FillPattern
                      id={`${id}-fill`}
                      fill={fill}
                      color={color}
                      cell={px}
                    />
                  </defs>
                  <path
                    d={area}
                    fill={`url(#${id}-fill)`}
                    opacity={reveal}
                    shapeRendering="crispEdges"
                  />
                </>
              )}
            </g>
          </g>
        ))}
        {shapes.map(({ color, key, line, seriesIndex }) => (
          <path
            key={key}
            d={line}
            pathLength={1}
            fill="none"
            stroke={cssColor(color)}
            strokeWidth={fill === "solid" ? 1.5 : 2}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={1}
            opacity={opacityOf(seriesIndex)}
            className={
              motion
                ? "ease-(--ease-out) [stroke-dashoffset:0] transition-[stroke-dashoffset,opacity] duration-700 motion-reduce:transition-none starting:[stroke-dashoffset:1]"
                : "transition-opacity duration-200 ease-out"
            }
          />
        ))}
      </>
    );
  };

  return (
    <CartesianChart
      {...props}
      data={data}
      x={x}
      series={series}
      colors={colors}
      scale={scale}
      layout="point"
      height={height}
      axes={axes}
      tooltip={tooltip}
      legend={legend ?? series.length > 1}
      interactive={interactive}
      animate={animate}
      cell={cell}
      formatValue={formatValue}
      formatTick={stack === "percent" ? formatPercent : formatValue}
      readout={readout}
      swatch={(_, color) => <Swatch color={color} />}
      scrub="line"
      pointsAt={(index, { yAt }) =>
        edges.map((row, seriesIndex) => ({
          seriesIndex,
          y: yAt(row[index]?.high ?? 0),
        }))
      }
      summary={summary}
    >
      {marks}
    </CartesianChart>
  );
};
