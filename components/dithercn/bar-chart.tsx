"use client";

import type { ComponentProps } from "react";

import {
  CartesianChart,
  chartSummary,
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

export interface BarChartProps<T> extends Omit<
  ComponentProps<"div">,
  "children"
> {
  /** One entry per bar (or group of bars), in order. */
  data: readonly T[];
  /** Key (or function) for each bar's category label. */
  x: Accessor<T, string | number>;
  /** One or more series. With several, bars sit side by side or stack. */
  series: NonEmpty<ChartSeries<T>>;
  /** `grouped`: series side by side. `stacked`: series on top of each other. Default `grouped`. */
  variant?: "grouped" | "stacked";
  /**
   * The bar drawn solid when nothing is hovered: an index, the `last`, the
   * `max`, or `none`. Default `last`.
   */
  highlight?: number | "last" | "max" | "none";
  /** Height in px, axes included. Default 240. */
  height?: number;
  /** Coverage of the dithered bar body, 0 to 1. Default 0.5. */
  level?: number;
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

/** Widest a single bar gets, so wide charts keep air between bars. */
const MAX_BAR = 36;
/** The surface gap between grouped bars and stacked segments. */
const GAP = 2;
/** Height of the solid cap on every bar. */
const CAP = 2;

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
 * A bar chart: each bar is a dithered body under a solid cap. The
 * highlighted bar, or the one under the pointer, fills in solid.
 */
export const BarChart = <T,>({
  data,
  x,
  series,
  variant = "grouped",
  highlight = "last",
  height = 240,
  level = 0.5,
  matrix = "bayer4",
  cell,
  axes = true,
  tooltip = true,
  legend,
  format,
  ...props
}: BarChartProps<T>) => {
  const stacked = variant === "stacked";
  const values = data.map((datum) =>
    series.map((entry) => readValue(datum, entry.value))
  );
  const totals = values.map((row) =>
    row.reduce((sum, value) => sum + Math.max(0, value), 0)
  );
  const scale = niceScale(stacked ? totals : values.flat());
  const highlighted = resolveHighlight(highlight, totals);
  const formatValue = toFormatter(format);
  const summary = chartSummary({
    data,
    kind: stacked ? "Stacked bar chart" : "Bar chart",
    series,
    x,
  });

  const peakAt = (index: number) =>
    stacked ? (totals[index] ?? 0) : Math.max(...(values[index] ?? [0]));

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

  const marks = (context: ChartContext) => {
    const { uid, cell: px, plot, active, xAt, yAt } = context;
    const current = active ?? highlighted;
    const lastBar = (index: number) => barsAt(index, context).at(-1);
    const labelBar =
      active === null && highlighted !== null
        ? lastBar(highlighted)
        : undefined;
    const labelValue = highlighted === null ? 0 : peakAt(highlighted);
    return (
      <>
        <defs>
          {series.map((entry, seriesIndex) => (
            <DitherPattern
              key={entry.label}
              id={`${uid}-bar-${seriesIndex}`}
              level={quantizeLevel(level)}
              matrix={seriesMatrix(matrix, seriesIndex)}
              cell={px}
              color={seriesColor(entry.color, seriesIndex)}
            />
          ))}
          <clipPath id={`${uid}-bar-clip`}>
            <rect
              x={plot.left}
              y={plot.top}
              width={plot.right - plot.left}
              height={plot.bottom - plot.top + 1}
            />
          </clipPath>
        </defs>
        <g clipPath={`url(#${uid}-bar-clip)`}>
          {data.map((_, index) => (
            <g
              // oxlint-disable-next-line react/no-array-index-key -- categories can repeat; position is the identity.
              key={index}
              // Each group rises its own height from below the baseline.
              className="ease-(--ease-out) translate-y-0 transition-[translate] duration-700 [transform-box:fill-box] motion-reduce:transition-none starting:translate-y-full"
              style={{ transitionDelay: `${Math.min(index * 30, 360)}ms` }}
            >
              {barsAt(index, context).map((bar) => {
                const color = cssColor(
                  seriesColor(series[bar.seriesIndex]?.color, bar.seriesIndex)
                );
                return (
                  <g key={bar.key}>
                    <rect
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={bar.height}
                      fill={`url(#${uid}-bar-${bar.seriesIndex})`}
                      shapeRendering="crispEdges"
                    />
                    <rect
                      x={bar.x}
                      y={bar.y}
                      width={bar.width}
                      height={bar.height}
                      fill={color}
                      opacity={index === current ? 1 : 0}
                      className="transition-opacity duration-150 ease-out motion-reduce:transition-none"
                      shapeRendering="crispEdges"
                    />
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
            y={Math.min(labelBar.y, yAt(labelValue)) - 6}
            textAnchor="middle"
            className="fill-foreground font-mono text-[10px] font-medium tabular-nums"
          >
            {formatValue(labelValue)}
          </text>
        )}
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
      layout="band"
      height={height}
      axes={axes}
      tooltip={tooltip}
      legend={legend ?? series.length > 1}
      cell={cell}
      formatValue={formatValue}
      swatch={(_, color) => <Swatch color={color} />}
      crosshair={false}
      summary={summary}
    >
      {marks}
    </CartesianChart>
  );
};
