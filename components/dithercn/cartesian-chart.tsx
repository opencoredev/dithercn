"use client";

import { useEffect, useId, useRef, useState } from "react";
import type {
  ComponentProps,
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
} from "react";

import { cssColor, MOTION, readDitherCell, useFrameLoop } from "@/lib/dither";
import type { DitherColor, DitherMatrix } from "@/lib/dither";
import { cn } from "@/lib/utils";

/**
 * The shared frame behind AreaChart, LineChart and BarChart: measuring,
 * scales, axes, the hover and keyboard readout, the legend and the
 * screen-reader table. The marks themselves come from each chart.
 */

/** The keys of `T` whose values are assignable to `V`. */
export type KeyOfType<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never;
}[keyof T];

/**
 * Where a chart reads a field: a key of the datum, or a function. Keys
 * work from Server Components; functions only from Client Components.
 */
export type Accessor<T, V> = KeyOfType<T, V> | ((datum: T) => V);

/** A category label, as text. */
export const readLabel = <T,>(
  datum: T,
  accessor: Accessor<T, string | number>
): string =>
  String(typeof accessor === "function" ? accessor(datum) : datum[accessor]);

/** A value, as a number. Anything that is not a finite number reads as 0. */
export const readValue = <T,>(datum: T, accessor: Accessor<T, number>) => {
  const raw =
    typeof accessor === "function" ? accessor(datum) : datum[accessor];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
};

/**
 * How values are written: `Intl.NumberFormat` options (usable from Server
 * Components) or a function.
 */
export type ValueFormat =
  | Intl.NumberFormatOptions
  | ((value: number) => string);

const COMPACT: Intl.NumberFormatOptions = {
  maximumFractionDigits: 1,
  notation: "compact",
};

/** A formatter for a `ValueFormat`. Default compact, as in 1.2K. */
export const toFormatter = (
  format: ValueFormat = COMPACT
): ((value: number) => string) => {
  if (typeof format === "function") {
    return format;
  }
  const formatter = new Intl.NumberFormat("en", format);
  return (value) => formatter.format(value);
};

/** One value read from every datum, drawn as one line, area or bar set. */
export interface ChartSeries<T> {
  /** Name in the legend, the readout and the data table. */
  label: string;
  /** The key holding this series' value, or a function that reads it. */
  value: Accessor<T, number>;
  /** Ink colour. Default: `--dither-ink`, then `--muted-foreground`, `--chart-3`, `--chart-5`. */
  color?: DitherColor;
}

export type NonEmpty<T> = readonly [T, ...T[]];

const SERIES_COLORS: NonEmpty<DitherColor> = [
  "--dither-ink",
  "--muted-foreground",
  "--chart-3",
  "--chart-5",
];

/** The colour a series draws in: its own, or the next default. */
export const seriesColor = (color: DitherColor | undefined, index: number) =>
  color ?? SERIES_COLORS[index % SERIES_COLORS.length] ?? SERIES_COLORS[0];

const SERIES_MATRICES: readonly DitherMatrix[] = ["bayer8", "bayer2"];

/**
 * The texture a series fills with. The first uses the chart's matrix; the
 * others switch texture so overlapping fills stay apart and identity never
 * rests on colour alone.
 */
export const seriesMatrix = (matrix: DitherMatrix, index: number) => {
  if (index === 0) {
    return matrix;
  }
  const others = SERIES_MATRICES.filter((candidate) => candidate !== matrix);
  return others[(index - 1) % others.length] ?? matrix;
};

/** Snap a length to whole device pixels so dither cells stay sharp. */
const snapToDevice = (px: number, dpr: number) =>
  Math.max(1, Math.round(px * dpr)) / dpr;

export interface ChartSize {
  width: number;
  /** Dither cell in CSS px, snapped to whole device pixels. */
  cell: number;
}

/**
 * Width of the element and the dither cell to draw with. `null` until the
 * first measurement, so charts render nothing on the server.
 */
export const useChartSize = (
  ref: { current: HTMLElement | null },
  cell?: number
): ChartSize | null => {
  const [measured, setMeasured] = useState<{
    width: number;
    baseCell: number;
    dpr: number;
  } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }
      setMeasured({
        baseCell: readDitherCell(el),
        dpr: window.devicePixelRatio || 1,
        width: Math.floor(entry.contentRect.width),
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  if (measured === null) {
    return null;
  }
  return {
    cell: snapToDevice(cell ?? measured.baseCell, measured.dpr),
    width: measured.width,
  };
};

/** Round a dither level to whole cells of a 4×4 tile so it renders exactly. */
export const quantizeLevel = (level: number) =>
  Math.round(Math.min(1, Math.max(0, level)) * 16) / 16;

const NICE_STEPS = [1, 2, 2.5, 5, 10];

export interface Scale {
  min: number;
  max: number;
  ticks: readonly number[];
}

/**
 * A y domain with round ticks that covers every value. With `zero` it
 * always includes zero, as bars and areas need.
 */
export const niceScale = (
  values: readonly number[],
  { zero = true, count = 4 }: { zero?: boolean; count?: number } = {}
): Scale => {
  const finite = values.filter((value) => Number.isFinite(value));
  const floor = zero ? [0] : [];
  const low = finite.length > 0 ? Math.min(...floor, ...finite) : 0;
  const high = finite.length > 0 ? Math.max(...floor, ...finite) : 1;
  const span = high - low || Math.abs(high) || 1;
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step =
    (NICE_STEPS.find((candidate) => candidate * magnitude >= raw) ?? 10) *
    magnitude;
  const min = Math.floor(low / step) * step;
  const max = Math.ceil(high / step) * step;
  const ticks: number[] = [];
  for (let tick = min; tick <= max + step / 2; tick += step) {
    ticks.push(Number(tick.toPrecision(12)));
  }
  return { max, min, ticks };
};

export interface Point {
  x: number;
  y: number;
}

/** Straight segments through the points. */
export const linearPath = (points: readonly Point[]) =>
  points
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x} ${y}`)
    .join("");

/**
 * A smooth curve through the points that never overshoots them
 * (monotone cubic, Fritsch–Carlson), so peaks stay at the data.
 */
export const monotonePath = (points: readonly Point[]) => {
  const count = points.length;
  if (count < 3) {
    return linearPath(points);
  }
  const slopes: number[] = [];
  for (let index = 0; index < count - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    slopes.push(a && b ? (b.y - a.y) / (b.x - a.x || 1) : 0);
  }
  const tangents = points.map((_, index) => {
    const before = slopes[index - 1];
    const after = slopes[index];
    if (before === undefined) {
      return after ?? 0;
    }
    if (after === undefined) {
      return before;
    }
    return before * after <= 0 ? 0 : (before + after) / 2;
  });
  for (let index = 0; index < count - 1; index += 1) {
    const slope = slopes[index] ?? 0;
    if (slope === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
    } else {
      const a = (tangents[index] ?? 0) / slope;
      const b = (tangents[index + 1] ?? 0) / slope;
      const length = a * a + b * b;
      if (length > 9) {
        const scale = 3 / Math.sqrt(length);
        tangents[index] = scale * a * slope;
        tangents[index + 1] = scale * b * slope;
      }
    }
  }
  let path = "";
  for (let index = 0; index < count; index += 1) {
    const point = points[index];
    const previous = points[index - 1];
    if (point === undefined) {
      break;
    }
    if (previous === undefined) {
      path += `M${point.x} ${point.y}`;
    } else {
      const third = (point.x - previous.x) / 3;
      const startTangent = tangents[index - 1] ?? 0;
      const endTangent = tangents[index] ?? 0;
      path += `C${previous.x + third} ${previous.y + startTangent * third} ${point.x - third} ${point.y - endTangent * third} ${point.x} ${point.y}`;
    }
  }
  return path;
};

/**
 * 0 → 1 over the entrance, stepping through dither levels, once the chart
 * is on screen. 1 at once under reduced motion.
 */
export const useReveal = (target: { current: Element | null }) => {
  const [progress, setProgress] = useState(0);
  const duration = (MOTION.slow + MOTION.base) / 1000;
  useFrameLoop(
    (time) => {
      const linear = Math.min(1, time / duration);
      // Cubic ease-out, then whole steps so React re-renders at most 16 times.
      setProgress(Math.round((1 - (1 - linear) ** 3) * 16) / 16);
    },
    { enabled: progress < 1, stillTime: duration, target }
  );
  return progress;
};

export interface Plot {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface ChartContext {
  /** Prefix for pattern, mask and clip ids. */
  uid: string;
  width: number;
  height: number;
  cell: number;
  plot: Plot;
  /** Centre of datum `index` on the x axis. */
  xAt: (index: number) => number;
  /** Width of one category: the step between points, or one bar band. */
  band: number;
  yAt: (value: number) => number;
  /** The datum under the pointer or keyboard focus. */
  active: number | null;
  /** Entrance progress, 0 → 1. */
  reveal: number;
}

export interface ReadoutRow {
  label: string;
  color: DitherColor;
  value: string;
}

export interface CartesianChartProps<T> extends Omit<
  ComponentProps<"div">,
  "children"
> {
  data: readonly T[];
  /** Category label for a datum, shown on the x axis and in the readout. */
  x: Accessor<T, string | number>;
  series: NonEmpty<ChartSeries<T>>;
  scale: Scale;
  /** `point`: data sit on the plot edges and between. `band`: each datum owns a slot. */
  layout: "point" | "band";
  height: number;
  axes: boolean;
  tooltip: boolean;
  legend: boolean;
  cell?: number;
  formatValue: (value: number) => string;
  /** Readout rows for a datum. Default: every series' value. */
  readout?: (datum: T) => readonly ReadoutRow[];
  /** Legend key for one series. */
  swatch: (index: number, color: DitherColor) => ReactNode;
  /** Draws a crosshair at the active datum (point layout). */
  crosshair: boolean;
  /** Short description of the chart, read before the data table. */
  summary: string;
  children: (context: ChartContext) => ReactNode;
}

const AXIS_FONT_WIDTH = 6.1;

/** Where the plot sits inside the chart, and the scales that map into it. */
const layoutPlot = ({
  axes,
  count,
  formatValue,
  height,
  layout,
  scale,
  width,
}: {
  axes: boolean;
  count: number;
  formatValue: (value: number) => string;
  height: number;
  layout: "point" | "band";
  scale: Scale;
  width: number;
}) => {
  const tickLabels = scale.ticks.map((tick) => formatValue(tick));
  const longest = Math.max(1, ...tickLabels.map((label) => label.length));
  const plot: Plot = {
    bottom: height - (axes ? 22 : 1),
    left: axes ? Math.ceil(longest * AXIS_FONT_WIDTH) + 10 : 0,
    right: width - (axes && layout === "point" ? 6 : 0),
    top: axes ? 8 : 4,
  };
  const plotWidth = Math.max(1, plot.right - plot.left);
  const slots = layout === "band" ? count : count - 1;
  const band = plotWidth / Math.max(1, slots);
  const xAt = (index: number) => {
    if (layout === "band") {
      return plot.left + band * (index + 0.5);
    }
    return plot.left + (count === 1 ? plotWidth / 2 : band * index);
  };
  const span = scale.max - scale.min || 1;
  const yAt = (value: number) =>
    plot.bottom - ((value - scale.min) / span) * (plot.bottom - plot.top);
  return { band, plot, plotWidth, tickLabels, xAt, yAt };
};

/** The hover and keyboard readout: the category, then every row's value. */
const Readout = ({
  title,
  rows,
  style,
}: {
  title: string;
  rows: readonly ReadoutRow[];
  style: CSSProperties;
}) => (
  <div
    aria-hidden="true"
    className="bg-popover text-popover-foreground border-border pointer-events-none absolute top-1 z-10 min-w-28 rounded-lg border px-2.5 py-2 text-xs shadow-[0_8px_24px_-12px_rgb(0_0_0/0.5)]"
    style={style}
  >
    <div className="text-muted-foreground mb-1.5 font-mono text-[10px] tracking-wide uppercase">
      {title}
    </div>
    <div className="flex flex-col gap-1">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2">
          <span
            className="h-0.5 w-2.5 shrink-0 rounded-full"
            style={{ background: cssColor(row.color) }}
          />
          <span className="font-medium tabular-nums">{row.value}</span>
          <span className="text-muted-foreground ml-auto pl-3">
            {row.label}
          </span>
        </div>
      ))}
    </div>
  </div>
);

/** Every value, for screen readers. */
const DataTable = ({
  summary,
  series,
  rows,
}: {
  summary: string;
  series: readonly { label: string }[];
  rows: readonly { label: string; values: readonly ReadoutRow[] }[];
}) => (
  <table className="sr-only">
    <caption>{summary}</caption>
    <thead>
      <tr>
        <th scope="col">Category</th>
        {series.map((entry) => (
          <th key={entry.label} scope="col">
            {entry.label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((row, index) => (
        // oxlint-disable-next-line react/no-array-index-key -- categories can repeat; position is the identity.
        <tr key={index}>
          <th scope="row">{row.label}</th>
          {row.values.map((value) => (
            <td key={value.label}>{value.value}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

/**
 * Every `every`th label, plus the last. The one before the last drops out
 * when it would sit too close to it.
 */
const xLabelIndices = (count: number, every: number) => {
  const step = Math.max(1, every);
  const shown = new Set<number>();
  for (let index = 0; index < count; index += step) {
    shown.add(index);
  }
  const last = count - 1;
  if (last > 0 && !shown.has(last)) {
    const previous = last - (last % step);
    if (previous > 0 && last - previous < step * 0.7) {
      shown.delete(previous);
    }
    shown.add(last);
  }
  return shown;
};

const labelAnchor = (
  layout: "point" | "band",
  index: number,
  count: number
) => {
  if (layout === "band" || count === 1) {
    return "middle";
  }
  if (index === 0) {
    return "start";
  }
  return index === count - 1 ? "end" : "middle";
};

/**
 * Measures itself, lays out the plot and owns the interaction. Charts pass
 * their marks as a render function of the layout.
 */
export const CartesianChart = <T,>({
  data,
  x,
  series,
  scale,
  layout,
  height,
  axes,
  tooltip,
  legend,
  cell,
  formatValue,
  readout,
  swatch,
  crosshair,
  summary,
  children,
  className,
  style,
  "aria-label": ariaLabel,
  ...props
}: CartesianChartProps<T>) => {
  const uid = useId().replaceAll(":", "");
  const ref = useRef<HTMLDivElement>(null);
  const size = useChartSize(ref, cell);
  const reveal = useReveal(ref);
  const [active, setActive] = useState<number | null>(null);

  const count = data.length;
  const width = size?.width ?? 0;
  const { plot, plotWidth, band, xAt, yAt, tickLabels } = layoutPlot({
    axes,
    count,
    formatValue,
    height,
    layout,
    scale,
    width,
  });

  const indexAt = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left - plot.left;
    const raw =
      layout === "band" ? Math.floor(px / band) : Math.round(px / band);
    return Math.min(count - 1, Math.max(0, raw));
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (count === 0) {
      return;
    }
    setActive(
      indexAt(event.clientX, event.currentTarget.getBoundingClientRect())
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (count === 0) {
      return;
    }
    const current = active ?? count - 1;
    const next: Record<string, number> = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      End: count - 1,
      Home: 0,
    };
    const target = next[event.key];
    if (target === undefined) {
      if (event.key === "Escape") {
        setActive(null);
      }
      return;
    }
    event.preventDefault();
    setActive(Math.min(count - 1, Math.max(0, target)));
  };

  const rowsFor = (datum: T): readonly ReadoutRow[] =>
    readout?.(datum) ??
    series.map((entry, index) => ({
      color: seriesColor(entry.color, index),
      label: entry.label,
      value: formatValue(readValue(datum, entry.value)),
    }));

  // Space x labels so they never collide: about one per 72px.
  const shownLabels = xLabelIndices(
    count,
    Math.ceil(count / Math.max(1, Math.floor(plotWidth / 72)))
  );
  const activeDatum = active === null ? undefined : data[active];
  const activeX = active === null ? 0 : xAt(active);

  return (
    <div {...props} className={cn("relative w-full", className)} style={style}>
      <div
        ref={ref}
        role="group"
        aria-label={ariaLabel ?? summary}
        aria-roledescription="chart"
        tabIndex={count > 0 ? 0 : -1}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((current) => current ?? count - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
        className="focus-visible:ring-ring/60 relative w-full touch-pan-y rounded-sm outline-none focus-visible:ring-2"
        style={{ height }}
      >
        {size === null ? null : (
          <svg
            aria-hidden="true"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="block overflow-visible select-none"
          >
            {axes ? (
              <g>
                {scale.ticks.map((tick, index) => (
                  <g key={tick}>
                    <line
                      x1={plot.left}
                      x2={plot.right}
                      y1={Math.round(yAt(tick)) + 0.5}
                      y2={Math.round(yAt(tick)) + 0.5}
                      className="stroke-border"
                      strokeWidth={1}
                      shapeRendering="crispEdges"
                    />
                    <text
                      x={plot.left - 10}
                      y={yAt(tick)}
                      dy="0.32em"
                      textAnchor="end"
                      className="fill-muted-foreground font-mono text-[10px] tabular-nums"
                    >
                      {tickLabels[index]}
                    </text>
                  </g>
                ))}
                {data.map((datum, index) =>
                  shownLabels.has(index) ? (
                    <text
                      // oxlint-disable-next-line react/no-array-index-key -- categories can repeat; position is the identity.
                      key={index}
                      x={xAt(index)}
                      y={height - 6}
                      textAnchor={labelAnchor(layout, index, count)}
                      className={cn(
                        "font-mono text-[10px] transition-[fill] duration-150",
                        index === active
                          ? "fill-foreground"
                          : "fill-muted-foreground"
                      )}
                    >
                      {readLabel(datum, x)}
                    </text>
                  ) : null
                )}
              </g>
            ) : null}
            {crosshair && active !== null ? (
              <line
                x1={Math.round(activeX) + 0.5}
                x2={Math.round(activeX) + 0.5}
                y1={plot.top}
                y2={plot.bottom}
                className="stroke-foreground/30"
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
            ) : null}
            {children({
              active,
              band,
              cell: size.cell,
              height,
              plot,
              reveal,
              uid,
              width,
              xAt,
              yAt,
            })}
          </svg>
        )}
        {tooltip && activeDatum !== undefined ? (
          <Readout
            title={readLabel(activeDatum, x)}
            rows={rowsFor(activeDatum)}
            style={
              activeX > width / 2
                ? { right: width - activeX + 12 }
                : { left: activeX + 12 }
            }
          />
        ) : null}
      </div>
      {legend ? (
        <ul
          aria-hidden="true"
          className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs"
        >
          {series.map((entry, index) => (
            <li key={entry.label} className="flex items-center gap-1.5">
              {swatch(index, seriesColor(entry.color, index))}
              {entry.label}
            </li>
          ))}
        </ul>
      ) : null}
      <DataTable
        summary={summary}
        series={series}
        rows={data.map((datum) => ({
          label: readLabel(datum, x),
          values: rowsFor(datum),
        }))}
      />
    </div>
  );
};

/** "Revenue and Costs" / "Revenue, Costs and Refunds". */
export const listLabels = (labels: readonly string[]) =>
  labels.length < 2
    ? (labels[0] ?? "")
    : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1) ?? ""}`;

/** "Area chart of Revenue and Costs, Jan to Dec." */
export const chartSummary = <T,>({
  kind,
  series,
  data,
  x,
}: {
  kind: string;
  series: readonly { label: string }[];
  data: readonly T[];
  x: Accessor<T, string | number>;
}) => {
  const [first] = data;
  const last = data.at(-1);
  const range =
    first === undefined || last === undefined
      ? ""
      : `, ${readLabel(first, x)} to ${readLabel(last, x)}`;
  return `${kind} of ${listLabels(series.map((entry) => entry.label))}${range}.`;
};
