"use client";

import { useMemo } from "react";
import type { ComponentProps } from "react";

import {
  CartesianChart,
  chartSummary,
  niceScale,
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
  Scale,
  ValueFormat,
} from "@/components/dithercn/cartesian-chart";
import { BloomGroup, cssColor, FillPattern } from "@/lib/dither";
import type { DitherColor, DitherMatrix } from "@/lib/dither";

export type {
  Accessor,
  ChartSeries,
  ValueFormat,
} from "@/components/dithercn/cartesian-chart";

/** How several series share a category. */
export type BarLayout = "grouped" | "stacked" | "percent";

export interface BarChartProps<T>
  extends Omit<ComponentProps<"div">, "children">, ChartStyleProps {
  /** One entry per bar (or group of bars), in order. */
  data: readonly T[];
  /** Key (or function) for each bar's category label. */
  x: Accessor<T, string | number>;
  /** One or more series. With several, bars sit side by side or stack. */
  series: NonEmpty<ChartSeries<T>>;
  /**
   * `grouped`: series side by side. `stacked`: series on top of each
   * other. `percent`: stacked and scaled to 100%. Default `grouped`.
   */
  layout?: BarLayout;
  /**
   * The bar drawn solid while nothing is scrubbed: an index, the `last`,
   * the `max`, or `none`. Default `last`.
   */
  highlight?: number | "last" | "max" | "none";
  /** Height in px, axes included. Default 240. */
  height?: number;
  /** Gradient only: coverage at the top of each bar, 0 to 1. Default 0.75. */
  level?: number;
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

const fillId = (uid: string, seriesIndex: number) =>
  `${uid}-bar-${seriesIndex}`;

/** Widest a single bar gets, so wide charts keep air between bars. */
const MAX_BAR = 36;
/** The surface gap between grouped bars and stacked segments. */
const GAP = 2;
/** Height of the solid cap on every bar. */
const CAP = 2;
/** Gradient bars fade over this share of the plot height from their top. */
const FADE = 0.7;
/** Coverage the gradient settles at, far from the top. */
const FLOOR = 0.125;

const PERCENT_SCALE: Scale = { max: 100, min: 0, ticks: [0, 25, 50, 75, 100] };
const formatPercent = (value: number) => `${Math.round(value)}%`;

const Swatch = ({ color }: { color: DitherColor }) => (
  <svg aria-hidden="true" width={10} height={10} className="shrink-0">
    <rect width={10} height={10} fill={cssColor(color)} opacity={0.4} />
    <rect width={10} height={CAP} fill={cssColor(color)} />
  </svg>
);

const resolveHighlight = (
  highlight: NonNullable<BarChartProps<unknown>["highlight"]>,
  totals: readonly number[]
): number | null => {
  if (totals.length === 0 || highlight === "none") {
    return null;
  }
  if (highlight === "last") {
    return totals.length - 1;
  }
  if (highlight === "max") {
    return totals.indexOf(Math.max(...totals));
  }
  return highlight >= 0 && highlight < totals.length ? highlight : null;
};

interface Bar {
  key: string;
  seriesIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A bar chart: each bar is a dithered body under a solid cap. With the
 * default `gradient` fill a bar is densest at its top and thins toward
 * the axis. The highlighted bar, or the scrubbed one, fills in solid.
 */
export const BarChart = <T,>({
  data,
  x,
  series,
  layout = "grouped",
  highlight = "last",
  height = 240,
  fill = "gradient",
  bloom = "off",
  colors,
  level = 0.75,
  matrix = "bayer4",
  cell,
  axes = true,
  tooltip = true,
  legend,
  interactive = true,
  animate = true,
  format,
  ...props
}: BarChartProps<T>) => {
  const stacked = layout !== "grouped";
  const formatValue = useMemo(() => toFormatter(format), [format]);
  const { values, totals, scale } = useMemo(() => {
    const raw = data.map((datum) =>
      series.map((entry) => readValue(datum, entry.value))
    );
    const sums = raw.map((row) =>
      row.reduce((sum, value) => sum + Math.max(0, value), 0)
    );
    const shown =
      layout === "percent"
        ? raw.map((row, index) =>
            row.map((value) => (Math.max(0, value) / (sums[index] || 1)) * 100)
          )
        : raw;
    let range: Scale = PERCENT_SCALE;
    if (layout === "stacked") {
      range = niceScale(sums);
    } else if (layout === "grouped") {
      range = niceScale(raw.flat());
    }
    return { scale: range, totals: sums, values: shown };
  }, [data, series, layout]);
  const highlighted = resolveHighlight(highlight, totals);
  const summary = chartSummary({
    data,
    kind: stacked ? "Stacked bar chart" : "Bar chart",
    series,
    x,
  });

  const readout = useMemo(() => {
    if (layout !== "percent") {
      return;
    }
    return (datum: T) => {
      const index = data.indexOf(datum);
      return series.map((entry, seriesIndex) => ({
        color: seriesColor(entry.color, seriesIndex, colors),
        label: entry.label,
        value: `${formatValue(readValue(datum, entry.value))} · ${formatPercent(values[index]?.[seriesIndex] ?? 0)}`,
      }));
    };
  }, [layout, data, series, colors, formatValue, values]);

  // The value written above a bar: the tallest in a group, or the stack's total.
  const peakAt = (index: number | null) => {
    if (index === null) {
      return 0;
    }
    return layout === "grouped"
      ? Math.max(...(values[index] ?? [0]))
      : (totals[index] ?? 0);
  };

  const barsAt = (
    index: number,
    { band, xAt, yAt }: Pick<ChartContext, "band" | "xAt" | "yAt">
  ): Bar[] => {
    const row = values[index] ?? [];
    const zero = yAt(0);
    if (stacked) {
      const width = Math.max(2, Math.round(Math.min(MAX_BAR, band * 0.6)));
      const left = Math.round(xAt(index) - width / 2);
      let top = zero;
      let running = 0;
      return row.flatMap((value, seriesIndex) => {
        if (value <= 0) {
          return [];
        }
        running += value;
        const next = Math.round(yAt(running));
        // Every segment above the first leaves a surface gap below it.
        const bottom = top === zero ? Math.round(zero) : top - GAP;
        const bar = {
          height: Math.max(0, bottom - next),
          key: `${index}-${seriesIndex}`,
          seriesIndex,
          width,
          x: left,
          y: next,
        };
        top = next;
        return bar.height > 0 ? [bar] : [];
      });
    }
    const count = row.length;
    const width = Math.max(
      2,
      Math.floor(Math.min(MAX_BAR, (band * 0.7 - GAP * (count - 1)) / count))
    );
    const groupWidth = width * count + GAP * (count - 1);
    const left = Math.round(xAt(index) - groupWidth / 2);
    return row.map((value, seriesIndex) => {
      const end = Math.round(yAt(value));
      const base = Math.round(zero);
      return {
        height: Math.abs(base - end),
        key: `${index}-${seriesIndex}`,
        seriesIndex,
        width,
        x: left + seriesIndex * (width + GAP),
        y: Math.min(base, end),
      };
    });
  };

  // A gradient is anchored at each bar's own top, so every bar gets a
  // light clone of its series' ramp that only moves the origin.
  const barFill = (uid: string, bar: Bar, index: number) =>
    fill === "gradient"
      ? `url(#${uid}-b${index}-${bar.seriesIndex})`
      : `url(#${fillId(uid, bar.seriesIndex)})`;

  const marks = (context: ChartContext) => {
    const {
      uid,
      cell: px,
      plot,
      xAt,
      yAt,
      scrubbing,
      animate: motion,
      colorOf,
      opacityOf,
    } = context;
    const plotHeight = plot.bottom - plot.top;
    const columns = data.map((_, index) => barsAt(index, context));
    const solidIndex = scrubbing ? null : highlighted;
    const labelBar =
      solidIndex === null ? undefined : columns[solidIndex]?.at(-1);
    const labelValue = peakAt(highlighted);
    return (
      <>
        <defs>
          {series.map((entry, seriesIndex) => (
            <FillPattern
              key={entry.label}
              id={fillId(uid, seriesIndex)}
              fill={fill}
              color={colorOf(seriesIndex)}
              cell={px}
              level={level}
              floor={FLOOR}
              matrix={matrix}
              ramp={{
                at: 0,
                edge: "top",
                extent: plotHeight + px * 8,
                length: plotHeight * FADE,
              }}
            />
          ))}
          {fill === "gradient"
            ? columns.flatMap((bars, index) =>
                bars.map((bar) => (
                  <pattern
                    key={bar.key}
                    id={`${uid}-b${index}-${bar.seriesIndex}`}
                    href={`#${fillId(uid, bar.seriesIndex)}`}
                    y={bar.y}
                  />
                ))
              )
            : null}
          <clipPath id={`${uid}-bar-clip`}>
            <rect
              x={plot.left}
              y={plot.top}
              width={plot.right - plot.left}
              height={plotHeight + 1}
            />
          </clipPath>
        </defs>
        <BloomGroup bloom={bloom} clipPath={`url(#${uid}-bar-clip)`}>
          {columns.flatMap((bars) =>
            bars.map((bar) => (
              <rect
                key={bar.key}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                fill={cssColor(colorOf(bar.seriesIndex))}
                opacity={opacityOf(bar.seriesIndex)}
              />
            ))
          )}
        </BloomGroup>
        <g clipPath={`url(#${uid}-bar-clip)`}>
          {columns.map((bars, index) => (
            <g
              // oxlint-disable-next-line react/no-array-index-key -- categories can repeat; position is the identity.
              key={index}
              // Each group rises its own height from below the baseline.
              className={
                motion
                  ? "ease-(--ease-out) translate-y-0 transition-[translate] duration-700 [transform-box:fill-box] motion-reduce:transition-none starting:translate-y-full"
                  : undefined
              }
              style={
                motion
                  ? { transitionDelay: `${Math.min(index * 30, 360)}ms` }
                  : undefined
              }
            >
              {bars.map((bar) => {
                const color = cssColor(colorOf(bar.seriesIndex));
                return (
                  <g
                    key={bar.key}
                    opacity={opacityOf(bar.seriesIndex)}
                    className="transition-opacity duration-200 ease-out motion-reduce:transition-none"
                  >
                    <rect
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={bar.height}
                      fill={barFill(uid, bar, index)}
                      shapeRendering="crispEdges"
                    />
                    {index === solidIndex ? (
                      <rect
                        x={bar.x}
                        y={bar.y}
                        width={bar.width}
                        height={bar.height}
                        fill={color}
                        shapeRendering="crispEdges"
                      />
                    ) : null}
                    <rect
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={Math.min(CAP, bar.height)}
                      fill={color}
                      shapeRendering="crispEdges"
                    />
                  </g>
                );
              })}
            </g>
          ))}
        </g>
        {labelBar === undefined || highlighted === null ? null : (
          <text
            x={xAt(highlighted)}
            y={
              (layout === "grouped"
                ? Math.min(labelBar.y, yAt(labelValue))
                : labelBar.y) - 6
            }
            textAnchor="middle"
            className="fill-foreground ease-(--ease-out) font-mono text-[10px] font-medium tabular-nums transition-opacity delay-700 duration-300 motion-reduce:transition-none starting:opacity-0"
          >
            {formatValue(labelValue)}
          </text>
        )}
      </>
    );
  };

  // The scrubbed column fills in solid, fading up over the dither.
  const activeMarks = (index: number, context: ChartContext) => (
    <g
      key={index}
      clipPath={`url(#${context.uid}-bar-clip)`}
      className="opacity-100 transition-opacity duration-150 ease-out motion-reduce:transition-none starting:opacity-0"
    >
      {barsAt(index, context).map((bar) => (
        <rect
          key={bar.key}
          x={bar.x}
          y={bar.y}
          width={bar.width}
          height={bar.height}
          fill={cssColor(context.colorOf(bar.seriesIndex))}
          opacity={context.opacityOf(bar.seriesIndex)}
          shapeRendering="crispEdges"
        />
      ))}
    </g>
  );

  return (
    <CartesianChart
      {...props}
      data={data}
      x={x}
      series={series}
      colors={colors}
      scale={scale}
      layout="band"
      height={height}
      axes={axes}
      tooltip={tooltip}
      legend={legend ?? series.length > 1}
      interactive={interactive}
      animate={animate}
      cell={cell}
      formatValue={formatValue}
      formatTick={layout === "percent" ? formatPercent : formatValue}
      readout={readout}
      swatch={(_, color) => <Swatch color={color} />}
      scrub="column"
      pointsAt={(index, context) =>
        barsAt(index, context).map((bar) => ({
          seriesIndex: bar.seriesIndex,
          y: bar.y,
        }))
      }
      activeMarks={activeMarks}
      summary={summary}
    >
      {marks}
    </CartesianChart>
  );
};
