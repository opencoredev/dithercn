"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ComponentProps, KeyboardEvent, PointerEvent } from "react";

import {
  BloomGroup,
  cssColor,
  MOTION,
  readDitherCell,
  SERIES_COLORS,
  thresholdAt,
  useFrameLoop,
} from "@/lib/dither";
import type {
  Bloom,
  DitherColor,
  DitherMatrix,
  FillVariant,
} from "@/lib/dither";
import { cn } from "@/lib/utils";

export type NonEmpty<T> = readonly [T, ...T[]];

export interface RadarSeries {
  /** Name in the legend, the readout and the data table. */
  label: string;
  /** One value per axis, in the order of `axes`. Missing values count as 0. */
  values: readonly number[];
  /** Colour: a palette name (`"green"`) or any CSS colour. Default: the chart's `colors`, then ink, orange, green, pink, purple, blue, red, grey. */
  color?: DitherColor;
  /** Texture of this series. Default: the chart's `fill`. */
  fill?: FillVariant;
}

/**
 * How values are written: `Intl.NumberFormat` options (usable from Server
 * Components) or a function.
 */
export type RadarFormat =
  | Intl.NumberFormatOptions
  | ((value: number) => string);

export type RadarChartProps = Omit<ComponentProps<"div">, "children"> & {
  /** Axis labels, clockwise from 12 o'clock. Three or more read best. */
  axes: NonEmpty<string>;
  /** One or more series, drawn in order (later ones on top). */
  series: NonEmpty<RadarSeries>;
  /** The value at the outer ring. Default: a round number above the largest value. */
  max?: number;
  /** Grid rings, which also set the steps of the gradient fill. Default 4. */
  rings?: number;
  /** Grid shape: straight-edged `polygon` or round `circle`. Default `polygon`. */
  grid?: "polygon" | "circle";
  /** Texture of every series: `gradient`, `dotted`, `hatched` or `solid`. Default `gradient`. */
  fill?: FillVariant;
  /** Soft glow in each series' colour behind it: `off`, `low` or `high`. Default `off`. */
  bloom?: Bloom;
  /** Colours by series position. A series' own `color` wins. */
  colors?: readonly DitherColor[];
  /** Largest width and height in CSS pixels; it shrinks to fit its container. Default 360. */
  size?: number;
  /** How values are written. Default compact, as in 1.2K. */
  format?: RadarFormat;
  /** Show the legend. Default: when there are two or more series. */
  legend?: boolean;
  /** Hover and keyboard scrubbing around the axes, and the legend spotlight. `false` for decoration. Default true. */
  interactive?: boolean;
  /** Grow out from the centre on first view. Default true; off under reduced motion. */
  animate?: boolean;
  /** Gradient only: threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Dither cell in CSS pixels. Default `--dither-cell`. */
  cell?: number;
};

const TAU = Math.PI * 2;
/** Room around the plot for the axis labels. */
const LABEL_ROOM = 54;
const DIMMED = 0.18;
const GROW_SECONDS = (MOTION.slow + MOTION.base) / 1000;
const GROW_STEPS = 24;
const GLIDE =
  "transition-[transform,opacity] duration-200 ease-(--ease-out) motion-reduce:transition-none data-[glide=false]:transition-[opacity]";

const toFormatter = (format: RadarFormat | undefined) => {
  if (typeof format === "function") {
    return format;
  }
  const formatter = new Intl.NumberFormat(
    "en",
    format ?? { maximumFractionDigits: 1, notation: "compact" }
  );
  return (value: number) => formatter.format(value);
};

const NICE = [1, 2, 2.5, 5, 10];

/** A round outer value at or above `value`. */
const niceMax = (value: number) => {
  if (value <= 0) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = NICE.find((candidate) => candidate * magnitude >= value) ?? 10;
  return step * magnitude;
};

const snap = (px: number) => {
  const dpr = window.devicePixelRatio || 1;
  return Math.max(1, Math.round(px * dpr)) / dpr;
};

/** The box width and dither cell, 0 until measured. */
const useBox = (ref: { current: HTMLDivElement | null }, cell?: number) => {
  const [box, setBox] = useState({ cell: cell ?? 3, width: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setBox({
        cell: snap(cell ?? readDitherCell(el)),
        width: Math.floor(entry?.contentRect.width ?? 0),
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, cell]);
  return box;
};

/** 0 → 1 over the entrance once on screen; 1 at once when off or reduced. */
const useGrow = (target: { current: Element | null }, enabled: boolean) => {
  const [progress, setProgress] = useState(enabled ? 0 : 1);
  useFrameLoop(
    (time) => {
      const linear = Math.min(1, time / GROW_SECONDS);
      setProgress(
        Math.round((1 - (1 - linear) ** 3) * GROW_STEPS) / GROW_STEPS
      );
    },
    { enabled: enabled && progress < 1, stillTime: GROW_SECONDS, target }
  );
  return progress;
};

interface Vec {
  x: number;
  y: number;
}

/** A point `radius` out along `angle` (clockwise from 12 o'clock). */
const polar = (angle: number, radius: number): Vec => ({
  x: Math.sin(angle) * radius,
  y: -Math.cos(angle) * radius,
});

/** Angle of a point from the centre, clockwise from 12 o'clock, in [0, 2π). */
const angleOf = ({ x, y }: Vec) => {
  const raw = Math.atan2(x, -y);
  return raw < 0 ? raw + TAU : raw;
};

/** How far a ray at `angle` reaches before it crosses the edge from a to b. */
const edgeRadius = (angle: number, a: Vec, b: Vec) => {
  const d = polar(angle, 1);
  const ex = b.x - a.x;
  const ey = b.y - a.y;
  const denominator = d.x * ey - d.y * ex;
  if (Math.abs(denominator) < 1e-9) {
    return Math.hypot(a.x, a.y);
  }
  return (a.x * ey - a.y * ex) / denominator;
};

interface Shape {
  index: number;
  label: string;
  color: DitherColor;
  fill: FillVariant;
  values: readonly number[];
  /** Vertices in px from the centre, at full size. */
  vertices: readonly Vec[];
}

/** Whether a cell inside a series is inked, from its texture and ring band. */
const inked = ({
  fill,
  x,
  y,
  band,
  rings,
  outline,
  matrix,
}: {
  fill: FillVariant;
  x: number;
  y: number;
  /** Ring band of the cell, 1 (innermost) to `rings`. */
  band: number;
  rings: number;
  outline: boolean;
  matrix: DitherMatrix;
}) => {
  if (fill === "solid" || outline) {
    return true;
  }
  if (fill === "dotted") {
    return y % 2 === 0 && (x + y / 2) % 2 === 0;
  }
  if (fill === "hatched") {
    return (x + y) % 4 === 3;
  }
  // Terraces: one density per ring band, thin at the centre, dense outside.
  const level = 1 / 16 + (11 / 16) * (band / rings) ** 1.4;
  return level > thresholdAt(matrix, x, y);
};

interface Cover {
  shape: Shape;
  /** Whether the cell is on the series' one-cell outline. */
  outline: boolean;
}

/** The series whose polygon covers a point, in drawing order. */
const coverAt = ({
  shapes,
  segment,
  point,
  angle,
  distance,
  scale,
  cell,
}: {
  shapes: readonly Shape[];
  /** The cell centre in px from the chart centre. */
  point: Vec;
  segment: number;
  angle: number;
  distance: number;
  scale: number;
  cell: number;
}) => {
  const covering: Cover[] = [];
  for (const shape of shapes) {
    const count = shape.vertices.length;
    const a = shape.vertices[segment] ?? { x: 0, y: 0 };
    const b = shape.vertices[(segment + 1) % count] ?? { x: 0, y: 0 };
    const reach = edgeRadius(angle, a, b) * scale;
    if (distance < reach) {
      // Distance to the edge itself, not along the ray, so shallow edges keep a full outline.
      const ex = (b.x - a.x) * scale;
      const ey = (b.y - a.y) * scale;
      const length = Math.hypot(ex, ey);
      const across =
        length < 1e-6
          ? reach - distance
          : Math.abs(
              ex * (point.y - a.y * scale) - ey * (point.x - a.x * scale)
            ) / length;
      covering.push({ outline: across < cell, shape });
    }
  }
  return covering;
};

/**
 * Who draws a cell. Outlines win (the last one on top). Where fills
 * overlap, the cell goes to one of them in turn along a diagonal, so
 * every series stays visible as an interleaved texture.
 */
const ownerOf = (covering: readonly Cover[], x: number, y: number) => {
  const outline = covering.findLast((cover) => cover.outline);
  if (outline !== undefined || covering.length < 2) {
    return outline ?? covering[0];
  }
  return covering[(x + y * 2) % covering.length];
};

/**
 * One path per series, in cell units: every cell inside the series'
 * polygon at `scale` of full size, with a one-cell solid outline.
 */
const rasterise = ({
  shapes,
  side,
  cell,
  radius,
  rings,
  scale,
  matrix,
}: {
  shapes: readonly Shape[];
  side: number;
  cell: number;
  radius: number;
  rings: number;
  scale: number;
  matrix: DitherMatrix;
}) => {
  const columns = Math.floor(side / cell);
  const centre = side / 2;
  const paths = shapes.map(() => "");
  const count = shapes[0]?.vertices.length ?? 0;
  const step = TAU / Math.max(1, count);
  for (let y = 0; y < columns; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const point = {
        x: (x + 0.5) * cell - centre,
        y: (y + 0.5) * cell - centre,
      };
      const distance = Math.hypot(point.x, point.y);
      if (distance <= radius * scale + cell) {
        const angle = angleOf(point);
        const segment = Math.floor(angle / step) % count;
        const band = Math.max(
          1,
          Math.ceil((distance / (radius * Math.max(scale, 1e-6))) * rings)
        );
        const covering = coverAt({
          angle,
          cell,
          distance,
          point,
          scale,
          segment,
          shapes,
        });
        const owner = ownerOf(covering, x, y);
        if (
          owner !== undefined &&
          inked({
            band,
            fill: owner.shape.fill,
            matrix,
            outline: owner.outline,
            rings,
            x,
            y,
          })
        ) {
          paths[owner.shape.index] += `M${x} ${y}h1v1h-1z`;
        }
      }
    }
  }
  return paths;
};

/** Grid rings and spokes, in px from the centre. */
const GridLines = ({
  count,
  radius,
  rings,
  shape,
  activeAxis,
}: {
  count: number;
  radius: number;
  rings: number;
  shape: "polygon" | "circle";
  activeAxis: number | null;
}) => {
  const step = TAU / count;
  return (
    <g aria-hidden="true" fill="none" className="stroke-border">
      {Array.from({ length: rings }, (_, ring) => {
        const r = (radius * (ring + 1)) / rings;
        const outer = ring === rings - 1;
        const dash = outer ? undefined : "1 3";
        if (shape === "circle") {
          return <circle key={ring} r={r} strokeDasharray={dash} />;
        }
        const points = Array.from({ length: count }, (__, axis) => {
          const p = polar(axis * step, r);
          return `${p.x},${p.y}`;
        }).join(" ");
        return <polygon key={ring} points={points} strokeDasharray={dash} />;
      })}
      {Array.from({ length: count }, (_, axis) => {
        const tip = polar(axis * step, radius);
        return (
          <line
            key={axis}
            x2={tip.x}
            y2={tip.y}
            className={cn(
              "transition-[stroke] duration-150",
              activeAxis === axis && "stroke-foreground/60"
            )}
          />
        );
      })}
    </g>
  );
};

/** Axis labels around the outside, pushed away from the plot. */
const AxisLabels = ({
  axes,
  radius,
  activeAxis,
}: {
  axes: readonly string[];
  radius: number;
  activeAxis: number | null;
}) => {
  const step = TAU / axes.length;
  return (
    <g aria-hidden="true" className="font-mono text-[10px]">
      {axes.map((label, axis) => {
        const angle = axis * step;
        const p = polar(angle, radius + 12);
        const sin = Math.sin(angle);
        let anchor: "start" | "middle" | "end" = "middle";
        if (sin > 0.3) {
          anchor = "start";
        } else if (sin < -0.3) {
          anchor = "end";
        }
        return (
          <text
            // oxlint-disable-next-line react/no-array-index-key -- labels can repeat; position is the identity.
            key={axis}
            x={p.x}
            y={p.y}
            textAnchor={anchor}
            dy={`${(0.34 - Math.cos(angle) * 0.5).toFixed(2)}em`}
            className={cn(
              "transition-[fill] duration-150",
              activeAxis === axis ? "fill-foreground" : "fill-muted-foreground"
            )}
          >
            {label}
          </text>
        );
      })}
    </g>
  );
};

/** Square markers on every vertex; the scrubbed axis gets a ring. */
const Markers = ({
  shapes,
  scale,
  cell,
  activeAxis,
  opacityOf,
}: {
  shapes: readonly Shape[];
  scale: number;
  cell: number;
  activeAxis: number | null;
  opacityOf: (index: number) => number;
}) => {
  const size = Math.max(4, cell * 2);
  return (
    <g aria-hidden="true">
      {shapes.map((shape) => (
        <g
          key={shape.index}
          className="transition-opacity duration-150 ease-out"
          style={{ opacity: opacityOf(shape.index) }}
        >
          {shape.vertices.map((vertex, axis) => {
            const active = activeAxis === axis;
            const side = active ? size + 4 : size;
            return (
              <rect
                // oxlint-disable-next-line react/no-array-index-key -- the axis is the identity.
                key={axis}
                x={Math.round(vertex.x * scale - side / 2)}
                y={Math.round(vertex.y * scale - side / 2)}
                width={side}
                height={side}
                fill={cssColor(shape.color)}
                stroke="var(--dither-paper)"
                strokeWidth={active ? 2 : 1}
              />
            );
          })}
        </g>
      ))}
    </g>
  );
};

interface Scrub {
  axis: number;
  glide: boolean;
  visible: boolean;
}

const KEY_STEPS: Readonly<Record<string, number>> = {
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -1,
};

/** The scrubbed axis: nearest to the pointer by angle, or stepped by keys. */
const useAxisScrub = ({
  count,
  centre,
  radius,
  onEscape,
}: {
  count: number;
  centre: number;
  radius: number;
  onEscape: () => void;
}) => {
  const [scrub, setScrub] = useState<Scrub | null>(null);
  const frame = useRef(0);
  const pointer = useRef<Vec | null>(null);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const hide = () =>
    setScrub((current) =>
      current === null ? null : { ...current, glide: false, visible: false }
    );

  const update = (point: Vec) => {
    const offset = { x: point.x - centre, y: point.y - centre };
    if (Math.hypot(offset.x, offset.y) > radius + LABEL_ROOM * 0.6) {
      hide();
      return;
    }
    const axis = Math.round(angleOf(offset) / (TAU / count)) % count;
    setScrub((current) =>
      current?.axis === axis && current.visible
        ? current
        : { axis, glide: current?.visible === true, visible: true }
    );
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    pointer.current = {
      x: event.clientX - box.left,
      y: event.clientY - box.top,
    };
    if (frame.current !== 0) {
      return;
    }
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (pointer.current !== null) {
        update(pointer.current);
      }
    });
  };
  const onPointerLeave = () => {
    pointer.current = null;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    hide();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      hide();
      onEscape();
      return;
    }
    const current = scrub?.visible === true ? scrub.axis : -1;
    const step = KEY_STEPS[event.key];
    let next: number | undefined;
    if (step !== undefined) {
      next = current === -1 ? 0 : (current + step + count) % count;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = count - 1;
    }
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    // The docs bind the arrows to prev/next page; the chart owns them while focused.
    event.stopPropagation();
    setScrub({ axis: next, glide: false, visible: true });
  };

  const onFocus = () =>
    setScrub((current) =>
      current?.visible === true
        ? current
        : { axis: current?.axis ?? 0, glide: false, visible: true }
    );

  return {
    handlers: { onBlur: hide, onFocus, onKeyDown },
    pointerHandlers: { onPointerLeave, onPointerMove },
    scrub,
  };
};

/** The readout card, beside the scrubbed axis tip, moved by transform. */
const Readout = ({
  axisLabel,
  rows,
  anchor,
  width,
  height,
  visible,
  glide,
  focus,
}: {
  axisLabel: string;
  rows: readonly { label: string; color: DitherColor; value: string }[];
  anchor: Vec & { angle: number };
  width: number;
  height: number;
  visible: boolean;
  glide: boolean;
  focus: number | null;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    // Sit on the outside of the tip: right of it on the right half, left on the left.
    const sin = Math.sin(anchor.angle);
    const cos = Math.cos(anchor.angle);
    let left = anchor.x - w / 2 + sin * (w / 2 + 14);
    let top = anchor.y - h / 2 - cos * (h / 2 + 14);
    left = Math.min(Math.max(0, left), Math.max(0, width - w));
    top = Math.min(Math.max(0, top), Math.max(0, height - h));
    el.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
  });
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-glide={String(glide)}
      className={cn(
        "bg-popover/95 text-popover-foreground border-border pointer-events-none absolute top-0 left-0 z-10 min-w-28 rounded-lg border px-2.5 py-2 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.6)] backdrop-blur-sm",
        GLIDE
      )}
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="text-muted-foreground mb-1.5 font-mono text-[10px] tracking-wide uppercase">
        {axisLabel}
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={cn(
              "flex items-center gap-2 text-xs transition-opacity duration-150",
              focus !== null && focus !== index && "opacity-40"
            )}
          >
            <span
              className="size-2 shrink-0 rounded-[2px]"
              style={{ background: cssColor(row.color) }}
            />
            <span className="text-muted-foreground pr-3">{row.label}</span>
            <span className="ml-auto font-mono font-medium tabular-nums">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Legend toggles: hover or focus spotlights a series, click locks it. */
const Legend = ({
  shapes,
  focus,
  locked,
  interactive,
  onHover,
  onLock,
}: {
  shapes: readonly Shape[];
  focus: number | null;
  locked: number | null;
  interactive: boolean;
  onHover: (index: number | null) => void;
  onLock: (index: number | null) => void;
}) => (
  <div
    className="mt-3 flex flex-wrap justify-center gap-1"
    {...(interactive
      ? { "aria-label": "Series", role: "group" }
      : { "aria-hidden": true })}
  >
    {shapes.map((shape) => {
      const content = (
        <>
          <span
            className="size-2 shrink-0 rounded-[2px]"
            style={{ background: cssColor(shape.color) }}
          />
          {shape.label}
        </>
      );
      const itemClass = cn(
        "text-muted-foreground inline-flex h-7 items-center gap-1.5 rounded-md px-2 font-mono text-[11px] transition-[color,opacity,background-color] duration-150 ease-out",
        focus !== null && focus !== shape.index && "opacity-45"
      );
      if (!interactive) {
        return (
          <span key={shape.index} className={itemClass}>
            {content}
          </span>
        );
      }
      return (
        <button
          key={shape.index}
          type="button"
          aria-pressed={locked === shape.index}
          aria-label={`Spotlight ${shape.label}`}
          onPointerEnter={() => onHover(shape.index)}
          onPointerLeave={() => onHover(null)}
          onFocus={() => onHover(shape.index)}
          onBlur={() => onHover(null)}
          onClick={() => onLock(locked === shape.index ? null : shape.index)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              onLock(null);
            }
          }}
          className={cn(
            itemClass,
            "hover:text-foreground focus-visible:ring-ring/60 aria-pressed:bg-muted aria-pressed:text-foreground cursor-pointer outline-none focus-visible:ring-2"
          )}
        >
          {content}
        </button>
      );
    })}
  </div>
);

/** Every value, for screen readers. */
const DataTable = ({
  summary,
  axes,
  shapes,
  format,
}: {
  summary: string;
  axes: readonly string[];
  shapes: readonly Shape[];
  format: (value: number) => string;
}) => (
  <table className="sr-only">
    <caption>{summary}</caption>
    <thead>
      <tr>
        <th scope="col">Axis</th>
        {shapes.map((shape) => (
          <th key={shape.index} scope="col">
            {shape.label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {axes.map((axis, index) => (
        // oxlint-disable-next-line react/no-array-index-key -- labels can repeat; position is the identity.
        <tr key={index}>
          <th scope="row">{axis}</th>
          {shapes.map((shape) => (
            <td key={shape.index}>{format(shape.values[index] ?? 0)}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const toShapes = ({
  axes,
  series,
  colors,
  fill,
  top,
  radius,
}: {
  axes: readonly string[];
  series: readonly RadarSeries[];
  colors: readonly DitherColor[] | undefined;
  fill: FillVariant;
  top: number;
  radius: number;
}): Shape[] => {
  const step = TAU / axes.length;
  return series.map((entry, index) => {
    const values = axes.map((_, axis) => {
      const raw = entry.values[axis] ?? 0;
      return Number.isFinite(raw) ? Math.max(0, raw) : 0;
    });
    return {
      color:
        entry.color ??
        colors?.[index] ??
        SERIES_COLORS[index % SERIES_COLORS.length] ??
        "ink",
      fill: entry.fill ?? fill,
      index,
      label: entry.label,
      values,
      vertices: values.map((value, axis) =>
        polar(axis * step, (Math.min(value, top) / top) * radius)
      ),
    };
  });
};

/** "Desktop and Mobile" / "A, B and C". */
const listLabels = (labels: readonly string[]) =>
  labels.length < 2
    ? (labels[0] ?? "")
    : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1) ?? ""}`;

/** Root props: a focusable, labelled group when interactive, else an image. */
const rootProps = ({
  interactive,
  uid,
  label,
  handlers,
}: {
  interactive: boolean;
  uid: string;
  label: string;
  handlers: ReturnType<typeof useAxisScrub>["handlers"];
}) =>
  interactive
    ? {
        ...handlers,
        "aria-describedby": `${uid}-keys`,
        "aria-label": label,
        "aria-roledescription": "chart",
        role: "group",
        tabIndex: 0,
      }
    : { "aria-label": label, role: "img" };

/** Key help and a live readout for screen readers. */
const ScreenReaderStatus = ({ id, text }: { id: string; text: string }) => (
  <>
    <p id={id} className="sr-only">
      Use the arrow keys to move between axes, Escape to clear.
    </p>
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {text}
    </div>
  </>
);

/** The drawing: grid, bloom, series cells, markers and labels. */
const Plot = ({
  axes,
  shapes,
  paths,
  side,
  cell,
  radius,
  rings,
  grid,
  bloom,
  scale,
  activeAxis,
  opacityOf,
  pointerHandlers,
}: {
  axes: readonly string[];
  shapes: readonly Shape[];
  paths: readonly string[];
  side: number;
  cell: number;
  radius: number;
  rings: number;
  grid: "polygon" | "circle";
  bloom: Bloom;
  scale: number;
  activeAxis: number | null;
  opacityOf: (index: number) => number;
  pointerHandlers:
    | ReturnType<typeof useAxisScrub>["pointerHandlers"]
    | undefined;
}) => (
  <svg
    aria-hidden="true"
    width={side}
    height={side}
    viewBox={`0 0 ${side} ${side}`}
    className="block overflow-visible select-none"
    {...pointerHandlers}
  >
    <g transform={`translate(${side / 2} ${side / 2})`}>
      <GridLines
        count={axes.length}
        radius={radius}
        rings={rings}
        shape={grid}
        activeAxis={activeAxis}
      />
    </g>
    <BloomGroup bloom={bloom} transform={`scale(${cell})`}>
      {shapes.map((shape) => (
        <path
          key={shape.index}
          d={paths[shape.index]}
          fill={cssColor(shape.color)}
          opacity={opacityOf(shape.index)}
        />
      ))}
    </BloomGroup>
    <g transform={`scale(${cell})`} shapeRendering="crispEdges">
      {shapes.map((shape) => (
        <path
          key={shape.index}
          d={paths[shape.index]}
          fill={cssColor(shape.color)}
          className="transition-opacity duration-150 ease-out motion-reduce:transition-none"
          style={{ opacity: opacityOf(shape.index) }}
        />
      ))}
    </g>
    <g transform={`translate(${side / 2} ${side / 2})`}>
      <Markers
        shapes={shapes}
        scale={scale}
        cell={cell}
        activeAxis={activeAxis}
        opacityOf={opacityOf}
      />
      <AxisLabels axes={axes} radius={radius} activeAxis={activeAxis} />
    </g>
  </svg>
);

/** Size, scale and the rasterised series for the current box. */
const useRadarDrawing = ({
  ref,
  axes,
  series,
  max,
  rings = 4,
  colors,
  fill = "gradient",
  size = 360,
  cell,
  matrix = "bayer4",
  animate = true,
}: {
  ref: { current: HTMLDivElement | null };
  axes: readonly string[];
  series: readonly RadarSeries[];
  max: number | undefined;
  rings: number | undefined;
  colors: readonly DitherColor[] | undefined;
  fill: FillVariant | undefined;
  size: number | undefined;
  cell: number | undefined;
  matrix: DitherMatrix | undefined;
  animate: boolean | undefined;
}) => {
  const box = useBox(ref, cell);
  const scale = useGrow(ref, animate);
  const side = Math.min(size, box.width);
  const radius = Math.max(0, side / 2 - LABEL_ROOM);
  const ringCount = Math.max(1, Math.round(rings));
  const top =
    max ?? niceMax(Math.max(...series.flatMap((entry) => entry.values)));
  const shapes = useMemo(
    () => toShapes({ axes, colors, fill, radius, series, top }),
    [axes, colors, fill, radius, series, top]
  );
  const paths = useMemo(
    () =>
      side <= 0
        ? shapes.map(() => "")
        : rasterise({
            cell: box.cell,
            matrix,
            radius,
            rings: ringCount,
            scale,
            shapes,
            side,
          }),
    [box.cell, matrix, radius, ringCount, scale, shapes, side]
  );
  return { cell: box.cell, paths, radius, ringCount, scale, shapes, side, top };
};

/** The readout over the scrubbed axis and its screen-reader twin. */
const ScrubLayer = ({
  axes,
  shapes,
  axis,
  scrubbing,
  glide,
  side,
  radius,
  focus,
  format,
  uid,
}: {
  axes: readonly string[];
  shapes: readonly Shape[];
  axis: number;
  scrubbing: boolean;
  glide: boolean;
  side: number;
  radius: number;
  focus: number | null;
  format: (value: number) => string;
  uid: string;
}) => {
  const rows = shapes.map((shape) => ({
    color: shape.color,
    label: shape.label,
    value: format(shape.values[axis] ?? 0),
  }));
  const angle = (axis * TAU) / axes.length;
  const tip = polar(angle, radius);
  return (
    <>
      <Readout
        axisLabel={axes[axis] ?? ""}
        rows={rows}
        anchor={{ angle, x: side / 2 + tip.x, y: side / 2 + tip.y }}
        width={side}
        height={side}
        visible={scrubbing}
        glide={glide}
        focus={focus}
      />
      <ScreenReaderStatus
        id={`${uid}-keys`}
        text={
          scrubbing
            ? `${axes[axis] ?? ""}: ${rows.map((row) => `${row.label} ${row.value}`).join(", ")}`
            : ""
        }
      />
    </>
  );
};

/**
 * A radar chart drawn in dither cells. Each series is a polygon of whole
 * cells with a solid outline; the gradient fill steps up in density ring
 * by ring, so the grid reads straight through it. Where series overlap
 * their cells interleave, so neither hides the other. Scrub around the
 * chart and the readout snaps to the nearest axis; the legend spotlights
 * and locks a series.
 */
export const RadarChart = ({
  axes,
  series,
  max,
  rings,
  grid = "polygon",
  fill,
  bloom = "off",
  colors,
  size,
  format,
  legend,
  interactive = true,
  animate,
  matrix,
  cell,
  className,
  "aria-label": ariaLabel,
  ...props
}: RadarChartProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId().replaceAll(":", "");
  const [hovered, setHovered] = useState<number | null>(null);
  const [locked, setLocked] = useState<number | null>(null);
  const formatValue = useMemo(() => toFormatter(format), [format]);
  const drawing = useRadarDrawing({
    animate,
    axes,
    cell,
    colors,
    fill,
    matrix,
    max,
    ref,
    rings,
    series,
    size,
  });
  const { side, radius, shapes } = drawing;
  const { scrub, handlers, pointerHandlers } = useAxisScrub({
    centre: side / 2,
    count: axes.length,
    onEscape: () => setLocked(null),
    radius,
  });

  const focus = interactive ? (hovered ?? locked) : null;
  const opacityOf = (index: number) =>
    focus === null || focus === index ? 1 : DIMMED;
  const scrubbing = interactive && scrub?.visible === true;
  const axis = scrub?.axis ?? 0;
  const summary =
    ariaLabel ??
    `Radar chart of ${listLabels(series.map((entry) => entry.label))} across ${String(axes.length)} axes, from 0 to ${formatValue(drawing.top)}.`;

  return (
    <div
      {...props}
      className={cn("flex w-full flex-col items-center", className)}
    >
      <div ref={ref} className="flex w-full justify-center">
        <div
          {...rootProps({ handlers, interactive, label: summary, uid })}
          className="focus-visible:ring-ring/60 relative rounded-lg outline-none focus-visible:ring-2"
          style={{ height: side, width: side }}
        >
          {side > 0 ? (
            <Plot
              axes={axes}
              shapes={shapes}
              paths={drawing.paths}
              side={side}
              cell={drawing.cell}
              radius={radius}
              rings={drawing.ringCount}
              grid={grid}
              bloom={bloom}
              scale={drawing.scale}
              activeAxis={scrubbing ? axis : null}
              opacityOf={opacityOf}
              pointerHandlers={interactive ? pointerHandlers : undefined}
            />
          ) : null}
          {interactive ? (
            <ScrubLayer
              axes={axes}
              shapes={shapes}
              axis={axis}
              scrubbing={scrubbing}
              glide={scrub?.glide ?? false}
              side={side}
              radius={radius}
              focus={focus}
              format={formatValue}
              uid={uid}
            />
          ) : null}
        </div>
      </div>
      {(legend ?? series.length > 1) ? (
        <Legend
          shapes={shapes}
          focus={focus}
          locked={locked}
          interactive={interactive}
          onHover={setHovered}
          onLock={setLocked}
        />
      ) : null}
      <DataTable
        summary={summary}
        axes={axes}
        shapes={shapes}
        format={formatValue}
      />
    </div>
  );
};
