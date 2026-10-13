"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ComponentProps, KeyboardEvent, PointerEvent } from "react";

import {
  BloomGroup,
  cssColor,
  DitherPattern,
  FillPattern,
  readDitherCell,
} from "@/lib/dither";
import type {
  Bloom,
  DitherColor,
  DitherMatrix,
  FillVariant,
} from "@/lib/dither";
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
  /** Colour: a palette name (`"green"`) or any CSS colour. Default `ink`. */
  color?: DitherColor;
  /** Fill under the line. Default true. */
  area?: boolean;
  /** Texture of the fill. `gradient` is densest just under the line. Default `gradient`. */
  fill?: FillVariant;
  /** Soft glow in `color` under the line and fill: `off`, `low` or `high`. Default `off`. */
  bloom?: Bloom;
  /**
   * Scrub with the pointer or arrow keys to read single values. Default
   * false: a sparkline is usually a glance, not a tool.
   */
  interactive?: boolean;
  /** Entrance motion. Default true; always off under reduced motion. */
  animate?: boolean;
  /** Dot on the latest value. Default true. */
  dot?: boolean;
  /** Gradient only: coverage of the fill just under the line, 0 to 1. Default 0.5. */
  level?: number;
  /** Threshold matrix. Default `bayer4`. */
  matrix?: DitherMatrix;
  /** Dither cell in px. Default 2, a step finer than `--dither-cell`. */
  cell?: number;
  /**
   * The value range the height covers, as `[min, max]`. Default: the
   * data's own range. Give a row of sparklines one domain to compare them.
   */
  domain?: readonly [number, number];
  /** Formats values in the summary and the readout. Default compact (1.2K). */
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

interface SparkPoint {
  x: number;
  y: number;
}

/** Points, the line through them and the closed fill below it, in px. */
const sparkGeometry = ({
  data,
  width,
  height,
  inset,
  domain,
}: {
  data: readonly number[];
  width: number | null;
  height: number;
  inset: number;
  domain: readonly [number, number];
}) => {
  const [floor, ceiling] = domain;
  const span = ceiling - floor || 1;
  const points: SparkPoint[] =
    width === null
      ? []
      : data.map((value, index) => ({
          x:
            data.length === 1
              ? width / 2
              : inset + (index / (data.length - 1)) * (width - inset * 2),
          y: inset + (1 - (value - floor) / span) * (height - inset * 2),
        }));
  const line = points
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x} ${y}`)
    .join("");
  const [start] = points;
  const end = points.at(-1);
  const area =
    start === undefined || end === undefined
      ? ""
      : `${line}L${end.x} ${height}L${start.x} ${height}Z`;
  return { area, end, line, points };
};

interface SparkScrub {
  index: number;
  glide: boolean;
}

const SPARK_STEPS: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
};

/** Pointer and arrow-key scrubbing over `count` points. */
const useSparkScrub = (count: number) => {
  const [active, setActive] = useState<SparkScrub | null>(null);
  const pick = (index: number, glide: boolean) =>
    setActive((current) =>
      current?.index === index
        ? current
        : { glide: glide && current !== null, index }
    );
  const onPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    if (count === 0) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const share = (event.clientX - rect.left) / Math.max(1, rect.width);
    pick(Math.round(share * (count - 1)), true);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Escape") {
      setActive(null);
      return;
    }
    const step = SPARK_STEPS[event.key];
    if (step === undefined || count === 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const current = active?.index ?? count - 1;
    pick(Math.min(count - 1, Math.max(0, current + step)), false);
  };
  return {
    active,
    handlers: {
      onBlur: () => setActive(null),
      onKeyDown,
      onPointerLeave: () => setActive(null),
      onPointerMove,
    },
  };
};

/** The textured fill under the line. `gradient` is densest near the line. */
const SparkFill = ({
  uid,
  area,
  variant,
  color,
  level,
  matrix,
  cell,
  width,
  height,
  animate,
}: {
  uid: string;
  area: string;
  variant: FillVariant;
  color: DitherColor;
  level: number;
  matrix: DitherMatrix;
  cell: number;
  width: number;
  height: number;
  animate: boolean;
}) => (
  <>
    <defs>
      {variant === "gradient" ? (
        <>
          <DitherPattern
            id={`${uid}-low`}
            level={Math.round(level * 8) / 16}
            matrix={matrix}
            cell={cell}
            color={color}
          />
          <DitherPattern
            id={`${uid}-high`}
            level={Math.round(level * 16) / 16}
            matrix={matrix}
            cell={cell}
            color={color}
          />
          <mask id={`${uid}-near`}>
            <rect width={width} height={height} fill="white" />
            <path
              d={area}
              transform={`translate(0 ${Math.max(cell * 2, height * 0.3)})`}
              fill="black"
              shapeRendering="crispEdges"
            />
          </mask>
        </>
      ) : (
        <FillPattern
          id={`${uid}-low`}
          fill={variant}
          color={color}
          cell={cell}
        />
      )}
    </defs>
    <g
      className={
        animate
          ? "ease-(--ease-out) transition-opacity duration-500 motion-reduce:transition-none starting:opacity-0"
          : undefined
      }
    >
      <path
        d={area}
        fill={`url(#${uid}-low)`}
        opacity={variant === "solid" ? 0.35 : 1}
        shapeRendering="crispEdges"
      />
      {variant === "gradient" ? (
        <path
          d={area}
          fill={`url(#${uid}-high)`}
          mask={`url(#${uid}-near)`}
          shapeRendering="crispEdges"
        />
      ) : null}
    </g>
  </>
);

const DRAW_IN =
  "ease-(--ease-out) [stroke-dashoffset:0] transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none starting:[stroke-dashoffset:1]";

type SparkStyle = Pick<
  SparklineProps,
  "color" | "area" | "fill" | "bloom" | "animate" | "level" | "matrix"
>;

/** The SVG: bloom, fill, line and the (scrubbed or latest) dot. */
const SparkSvg = ({
  uid,
  width,
  height,
  cell,
  geometry,
  marker,
  glide,
  emphasis,
  look: {
    color = "ink",
    area = true,
    fill: variant = "gradient",
    bloom = "off",
    animate = true,
    level = 0.5,
    matrix = "bayer4",
  },
}: {
  uid: string;
  width: number;
  height: number;
  cell: number;
  geometry: ReturnType<typeof sparkGeometry>;
  marker: SparkPoint | null;
  glide: string;
  /** The dot marks a scrubbed point, so it draws a touch larger. */
  emphasis: boolean;
  look: SparkStyle;
}) => {
  const ink = cssColor(color);
  return (
    <svg
      aria-hidden="true"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block overflow-visible"
    >
      <BloomGroup bloom={bloom}>
        <path
          d={area ? geometry.area : geometry.line}
          fill={area ? ink : "none"}
          stroke={ink}
          strokeWidth={4}
        />
      </BloomGroup>
      {area ? (
        <SparkFill
          uid={uid}
          area={geometry.area}
          variant={variant}
          color={color}
          level={level}
          matrix={matrix}
          cell={cell}
          width={width}
          height={height}
          animate={animate}
        />
      ) : null}
      <path
        d={geometry.line}
        pathLength={1}
        fill="none"
        stroke={ink}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={1}
        className={animate ? DRAW_IN : undefined}
      />
      {marker === null ? null : (
        <circle
          data-glide={glide}
          r={emphasis ? DOT + 0.5 : DOT}
          fill={ink}
          stroke="var(--dither-paper)"
          strokeWidth={1.5}
          style={{ transform: `translate(${marker.x}px, ${marker.y}px)` }}
          className="ease-(--ease-out) transition-[transform,opacity] duration-200 motion-reduce:transition-none data-[glide=false]:transition-none starting:opacity-0"
        />
      )}
    </svg>
  );
};

/** The value label over the scrubbed point, and its live announcement. */
const SparkReadout = ({
  x,
  text,
  glide,
}: {
  x: number | undefined;
  text: string;
  glide: string;
}) => (
  <>
    {x === undefined ? null : (
      <span
        aria-hidden="true"
        data-glide={glide}
        className="bg-popover text-popover-foreground border-border pointer-events-none absolute bottom-full left-0 mb-1.5 rounded-md border px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap tabular-nums transition-transform duration-200 ease-(--ease-out) motion-reduce:transition-none data-[glide=false]:transition-none"
        style={{ transform: `translateX(calc(${x}px - 50%))` }}
      >
        {text}
      </span>
    )}
    <span aria-live="polite" className="sr-only">
      {text}
    </span>
  </>
);

/** The dot: on the scrubbed point, else on the latest one when `dot` is on. */
const markerAt = ({
  scrubbed,
  latest,
  dot,
}: {
  scrubbed: SparkPoint | undefined;
  latest: SparkPoint | undefined;
  dot: boolean;
}): SparkPoint | null => {
  if (scrubbed !== undefined) {
    return scrubbed;
  }
  return dot && latest !== undefined ? latest : null;
};

const COMPACT: Intl.NumberFormatOptions = {
  maximumFractionDigits: 1,
  notation: "compact",
};

/** "Revenue: 1.2K to 3.4K, low 1K, high 3.6K". */
const describe = (
  label: string,
  data: readonly number[],
  numbers: Intl.NumberFormat
) => {
  const [first] = data;
  const last = data.at(-1);
  if (first === undefined || last === undefined) {
    return `${label}: no data`;
  }
  return `${label}: ${numbers.format(first)} to ${numbers.format(last)}, low ${numbers.format(Math.min(...data))}, high ${numbers.format(Math.max(...data))}`;
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
  interactive = false,
  dot = true,
  cell,
  domain,
  format = COMPACT,
  color,
  area,
  fill,
  bloom,
  animate,
  level,
  matrix,
  className,
  style,
  ...props
}: SparklineProps) => {
  const uid = useId().replaceAll(":", "");
  const ref = useRef<HTMLSpanElement>(null);
  const width = useWidth(ref);
  const [px, setPx] = useState(2);
  const { active, handlers } = useSparkScrub(data.length);

  useEffect(() => {
    setPx(snapToDevice(cell ?? Math.max(1, readDitherCell(ref.current) - 1)));
  }, [cell]);

  const numbers = new Intl.NumberFormat("en", format);
  const summary = describe(label, data, numbers);
  // Leave room for the stroke and the dot so neither is clipped.
  const geometry = sparkGeometry({
    data,
    domain: domain ?? [Math.min(...data), Math.max(...data)],
    height,
    inset: (dot ? DOT : 0) + STROKE,
    width,
  });
  const scrubbed = active === null ? undefined : geometry.points[active.index];
  const scrubbedValue = active === null ? undefined : data[active.index];
  const glide = String(active?.glide ?? false);
  const readout =
    scrubbedValue === undefined ? "" : numbers.format(scrubbedValue);

  return (
    <span
      {...props}
      ref={ref}
      {...(interactive
        ? { ...handlers, "aria-label": summary, role: "group", tabIndex: 0 }
        : { "aria-label": summary, role: "img" })}
      className={cn(
        "relative inline-block w-full align-middle",
        interactive &&
          "focus-visible:ring-ring/60 rounded-sm outline-none focus-visible:ring-2",
        className
      )}
      style={{ height, ...style }}
    >
      {width === null || geometry.end === undefined ? null : (
        <SparkSvg
          uid={uid}
          width={width}
          height={height}
          cell={px}
          geometry={geometry}
          marker={markerAt({ dot, latest: geometry.end, scrubbed })}
          glide={glide}
          emphasis={scrubbed !== undefined}
          look={{ animate, area, bloom, color, fill, level, matrix }}
        />
      )}
      {interactive ? (
        <SparkReadout x={scrubbed?.x} text={readout} glide={glide} />
      ) : null}
    </span>
  );
};
