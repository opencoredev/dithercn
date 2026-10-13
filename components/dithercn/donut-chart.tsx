"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  ComponentProps,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  RefObject,
} from "react";

import {
  BloomGroup,
  cssColor,
  MOTION,
  readDitherCell,
  SERIES_COLORS,
  subscribeToTheme,
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

export interface DonutSlice {
  /** Name in the legend, the centre and the data table. */
  label: string;
  /** Size of the slice. Negative values count as 0. */
  value: number;
  /** Colour: a palette name (`"green"`) or any CSS colour. Default: the chart's `colors`, then ink, orange, green, pink, purple, blue, red, grey. */
  color?: DitherColor;
  /** Texture of this slice. Default: the chart's `fill`. */
  fill?: FillVariant;
}

/**
 * How values are written: `Intl.NumberFormat` options (usable from Server
 * Components) or a function.
 */
export type DonutFormat =
  | Intl.NumberFormatOptions
  | ((value: number) => string);

export type DonutChartProps = Omit<ComponentProps<"figure">, "children"> & {
  /** The slices, drawn clockwise from 12 o'clock in this order. */
  data: readonly DonutSlice[];
  /** What the total counts, such as `"Requests today"`. Shown in the centre and used in the summary. */
  label: string;
  /** `donut`: a ring with the total in the middle. `pie`: full wedges, with a readout over the active one. Default `donut`. */
  mode?: "donut" | "pie";
  /** Texture of every slice: `gradient`, `dotted`, `hatched` or `solid`. Default `gradient`. */
  fill?: FillVariant;
  /** Soft glow in each slice's colour behind it: `off`, `low` or `high`. Default `off`. */
  bloom?: Bloom;
  /** Colours by slice position, as palette names or CSS colours. A slice's own `color` wins. */
  colors?: readonly DitherColor[];
  /** Diameter in CSS pixels. Default 220. */
  size?: number;
  /** Donut only: ring thickness as a share of the radius, 0.1 to 0.9. Default 0.36. */
  thickness?: number;
  /** Gap between slices, in dither cells. Default 1. */
  gap?: number;
  /** Shown after every value, such as `" GB"`. */
  unit?: string;
  /** How values are written. Default: whole numbers with separators. */
  format?: DonutFormat;
  /** Show the legend. When false it stays available to screen readers. Default true. */
  legend?: boolean;
  /** Hover, keyboard focus and the legend spotlight. `false` for a decorative chart. Default true. */
  interactive?: boolean;
  /** Sweep the slices in clockwise on first view. Default true; always off under reduced motion. */
  animate?: boolean;
  /** Gradient only: threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Dither cell in CSS pixels. Default `--dither-cell`. */
  cell?: number;
};

const TAU = Math.PI * 2;
/** Cells kept free around the chart so a spotlit slice can step outward. */
const POP = 2;
const DIMMED = 0.18;
/** Gradient coverage at the inner end of a slice. */
const FLOOR = 3 / 16;
/** Pie wedges converge, so their gradient keeps more ink toward the centre. */
const PIE_FLOOR = 6 / 16;
const SWEEP_SECONDS = (MOTION.slow + MOTION.base * 2) / 1000;
const SWEEP_STEPS = 60;

const GLIDE =
  "transition-[transform,opacity] duration-200 ease-(--ease-out) motion-reduce:transition-none";

/** `cell` or `--dither-cell`, snapped to whole device pixels. 3 on the server. */
const useCellSize = (ref: RefObject<Element | null>, cell?: number) =>
  useSyncExternalStore(
    subscribeToTheme,
    () => {
      const dpr = window.devicePixelRatio || 1;
      const raw = cell ?? readDitherCell(ref.current);
      return Math.max(1, Math.round(raw * dpr)) / dpr;
    },
    () => cell ?? 3
  );

const toFormatter = (format: DonutFormat | undefined, unit: string) => {
  if (typeof format === "function") {
    return (value: number) => `${format(value)}${unit}`;
  }
  const formatter = new Intl.NumberFormat(
    "en",
    format ?? { maximumFractionDigits: 0 }
  );
  return (value: number) => `${formatter.format(value)}${unit}`;
};

const percent = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  style: "percent",
});

interface SliceGeometry {
  index: number;
  label: string;
  value: number;
  share: number;
  color: DitherColor;
  fill: FillVariant;
  /** Start and end angle, radians clockwise from 12 o'clock. */
  from: number;
  to: number;
}

const toSlices = ({
  data,
  colors,
  fill,
}: {
  data: readonly DonutSlice[];
  colors: readonly DitherColor[] | undefined;
  fill: FillVariant;
}) => {
  const values = data.map(({ value }) =>
    Number.isFinite(value) ? Math.max(0, value) : 0
  );
  const total = values.reduce((sum, value) => sum + value, 0);
  let angle = 0;
  const slices: SliceGeometry[] = data.map((slice, index) => {
    const value = values[index] ?? 0;
    const share = total > 0 ? value / total : 0;
    const from = angle;
    angle += share * TAU;
    return {
      color:
        slice.color ??
        colors?.[index] ??
        SERIES_COLORS[index % SERIES_COLORS.length] ??
        "ink",
      fill: slice.fill ?? fill,
      from,
      index,
      label: slice.label,
      share,
      to: angle,
      value,
    };
  });
  return { slices, total };
};

/** Angle of a point from the centre, clockwise from 12 o'clock, in [0, 2π). */
const angleOf = (dx: number, dy: number) => {
  const raw = Math.atan2(dx, -dy);
  return raw < 0 ? raw + TAU : raw;
};

/** Whether a point lies within `half` of the ray at `angle` (a slice edge). */
const nearEdge = (dx: number, dy: number, angle: number, half: number) => {
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  const along = dx * sx + dy * sy;
  return along > -half && Math.abs(dx * sy - dy * sx) < half;
};

/** Whether a slice's cell is inked, from its texture and its depth into the slice. */
const inked = ({
  fill,
  x,
  y,
  depth,
  outline,
  floor,
  matrix,
}: {
  fill: FillVariant;
  x: number;
  y: number;
  /** 0 at the outer rim, 1 at the inner edge (or the centre). */
  depth: number;
  /** Whether the cell lies on the slice's outline, one cell wide. */
  outline: boolean;
  /** Gradient coverage at the inner end. */
  floor: number;
  matrix: DitherMatrix;
}) => {
  // Every texture is drawn inside a solid outline, like the capped bars.
  if (fill === "solid" || outline) {
    return true;
  }
  if (fill === "dotted") {
    return y % 2 === 0 && (x + y / 2) % 2 === 0;
  }
  if (fill === "hatched") {
    return (x + y) % 4 === 3;
  }
  const level = floor + (1 - floor) * (1 - depth) ** 1.4;
  return level > thresholdAt(matrix, x, y);
};

interface Cell {
  x: number;
  y: number;
  slice: number;
  angle: number;
}

interface Raster {
  /** Grid side in cells. */
  side: number;
  outer: number;
  inner: number;
  cells: readonly Cell[];
}

interface Hit {
  /** The slice, or -1 in a gap. */
  index: number;
  /** Whether the point is within one cell of a gap. */
  edge: boolean;
}

/** The slice a point (in cells, from the centre) falls in. */
const sliceAt = ({
  dx,
  dy,
  slices,
  gap,
}: {
  dx: number;
  dy: number;
  slices: readonly SliceGeometry[];
  gap: number;
}): Hit => {
  const angle = angleOf(dx, dy);
  const shown = slices.filter((slice) => slice.share > 0);
  const owner = shown.find((slice) => angle >= slice.from && angle < slice.to);
  if (owner === undefined) {
    return { edge: false, index: -1 };
  }
  if (shown.length < 2) {
    return { edge: false, index: owner.index };
  }
  const half = gap / 2;
  const near = (reach: number) =>
    shown.some((slice) => nearEdge(dx, dy, slice.from, reach));
  if (gap > 0 && near(half)) {
    return { edge: false, index: -1 };
  }
  return { edge: near(half + 1), index: owner.index };
};

/**
 * Every inked cell of the chart, row by row: the slice it belongs to and
 * its angle, so the entrance can sweep cells in without re-measuring.
 */
const rasterise = ({
  size,
  cell,
  mode,
  thickness,
  gap,
  slices,
  matrix,
}: {
  size: number;
  cell: number;
  mode: "donut" | "pie";
  thickness: number;
  gap: number;
  slices: readonly SliceGeometry[];
  matrix: DitherMatrix;
}): Raster => {
  const side = Math.max(8, Math.floor(size / cell));
  const outer = side / 2 - POP;
  const ring = Math.min(0.9, Math.max(0.1, thickness));
  const inner = mode === "pie" ? 0 : Math.round(outer * (1 - ring));
  const cells: Cell[] = [];
  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const dx = x + 0.5 - side / 2;
      const dy = y + 0.5 - side / 2;
      const radius = Math.hypot(dx, dy);
      if (radius < outer && radius >= inner) {
        const hit = sliceAt({ dx, dy, gap, slices });
        const geometry = slices[hit.index];
        const depth = (outer - radius) / Math.max(1, outer - inner);
        const outline =
          outer - radius < 1 || (inner > 0 && radius - inner < 1) || hit.edge;
        if (
          geometry !== undefined &&
          inked({
            depth,
            fill: geometry.fill,
            floor: mode === "pie" ? PIE_FLOOR : FLOOR,
            matrix,
            outline,
            x,
            y,
          })
        ) {
          cells.push({ angle: angleOf(dx, dy), slice: hit.index, x, y });
        }
      }
    }
  }
  return { cells, inner, outer, side };
};

/** One path per slice covering its cells up to `sweep` radians, in cell units. */
const slicePaths = (raster: Raster, count: number, sweep: number) => {
  const paths = Array.from({ length: count }, () => "");
  let run: { x: number; y: number; slice: number; length: number } | null =
    null;
  const flush = () => {
    if (run !== null) {
      paths[run.slice] += `M${run.x} ${run.y}h${run.length}v1h${-run.length}z`;
    }
  };
  for (const cell of raster.cells) {
    if (cell.angle <= sweep) {
      if (
        run !== null &&
        run.y === cell.y &&
        run.slice === cell.slice &&
        run.x + run.length === cell.x
      ) {
        run.length += 1;
      } else {
        flush();
        run = { length: 1, slice: cell.slice, x: cell.x, y: cell.y };
      }
    }
  }
  flush();
  return paths;
};

/** 0 → 2π over the entrance once on screen; 2π at once when off or reduced. */
const useSweep = (target: RefObject<Element | null>, enabled: boolean) => {
  const [sweep, setSweep] = useState(enabled ? 0 : TAU);
  useFrameLoop(
    (time) => {
      const linear = Math.min(1, time / SWEEP_SECONDS);
      const eased = 1 - (1 - linear) ** 3;
      setSweep(
        linear >= 1
          ? TAU
          : (Math.round(eased * SWEEP_STEPS) / SWEEP_STEPS) * TAU
      );
    },
    { enabled: enabled && sweep < TAU, stillTime: SWEEP_SECONDS, target }
  );
  return sweep;
};

/** Offset in whole cells that steps a slice outward along its bisector. */
const popOffset = (slice: SliceGeometry, cell: number) => {
  const middle = (slice.from + slice.to) / 2;
  return {
    x: Math.round(Math.sin(middle) * POP) * cell,
    y: Math.round(-Math.cos(middle) * POP) * cell,
  };
};

const KEY_STEPS: Readonly<Record<string, number>> = {
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -1,
};

/**
 * Hovered and locked slices. Hover (pointer, legend or keyboard) wins over
 * the lock; the lock survives the pointer leaving; Escape clears both.
 */
const useSpotlight = (slices: readonly SliceGeometry[]) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const [locked, setLocked] = useState<number | null>(null);
  const shown = slices.filter((slice) => slice.share > 0).map((s) => s.index);
  const focus = hovered ?? locked;

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      setHovered(null);
      setLocked(null);
      return;
    }
    if (shown.length === 0) {
      return;
    }
    const position = focus === null ? -1 : shown.indexOf(focus);
    const step = KEY_STEPS[event.key];
    let next: number | undefined;
    if (step !== undefined) {
      next =
        shown[
          position === -1 ? 0 : (position + step + shown.length) % shown.length
        ];
    } else if (event.key === "Home") {
      [next] = shown;
    } else if (event.key === "End") {
      next = shown.at(-1);
    } else if (event.key === "Enter" || event.key === " ") {
      setLocked(locked === focus ? null : focus);
    } else {
      return;
    }
    event.preventDefault();
    // The docs bind the arrows to prev/next page; the chart owns them while focused.
    event.stopPropagation();
    if (next !== undefined) {
      setHovered(next);
    }
  };

  return { focus, locked, onKeyDown, setHovered, setLocked };
};

/** Pointer hit-testing on the drawing, throttled to one update per frame. */
const usePointerSlice = ({
  raster,
  cell,
  slices,
  onSlice,
  onPick,
}: {
  raster: Raster;
  cell: number;
  slices: readonly SliceGeometry[];
  onSlice: (index: number | null) => void;
  /** A click: the slice under the pointer, or null off the chart. */
  onPick: (index: number | null) => void;
}) => {
  const frame = useRef(0);
  const point = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const sliceFor = (x: number, y: number) => {
    const dx = x / cell - raster.side / 2;
    const dy = y / cell - raster.side / 2;
    const radius = Math.hypot(dx, dy);
    if (radius > raster.outer + POP || radius < raster.inner - 1) {
      return null;
    }
    const { index } = sliceAt({ dx, dy, gap: 0, slices });
    return index === -1 ? null : index;
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    point.current = { x: event.clientX - box.left, y: event.clientY - box.top };
    if (frame.current !== 0) {
      return;
    }
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (point.current !== null) {
        onSlice(sliceFor(point.current.x, point.current.y));
      }
    });
  };
  const onPointerLeave = () => {
    point.current = null;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    onSlice(null);
  };
  const onClick = (event: MouseEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    onPick(sliceFor(event.clientX - box.left, event.clientY - box.top));
  };
  return { handlers: { onClick, onPointerLeave, onPointerMove } };
};

/** The drawing: bloom, then each slice as one path of cells. */
const Slices = ({
  slices,
  paths,
  cell,
  bloom,
  focus,
}: {
  slices: readonly SliceGeometry[];
  paths: readonly string[];
  cell: number;
  bloom: Bloom;
  focus: number | null;
}) => {
  const transformOf = (slice: SliceGeometry) => {
    const offset =
      focus === slice.index ? popOffset(slice, cell) : { x: 0, y: 0 };
    return `translate(${offset.x}px, ${offset.y}px)`;
  };
  return (
    <>
      <BloomGroup bloom={bloom} transform={`scale(${cell})`}>
        {slices.map((slice) => (
          <path
            key={slice.index}
            d={paths[slice.index]}
            fill={cssColor(slice.color)}
            opacity={focus === null || focus === slice.index ? 1 : DIMMED}
          />
        ))}
      </BloomGroup>
      {slices.map((slice) => (
        <g
          key={slice.index}
          className={GLIDE}
          style={{
            opacity: focus === null || focus === slice.index ? 1 : DIMMED,
            transform: transformOf(slice),
          }}
        >
          <path
            d={paths[slice.index]}
            transform={`scale(${cell})`}
            fill={cssColor(slice.color)}
            shapeRendering="crispEdges"
          />
        </g>
      ))}
    </>
  );
};

/** A font size that fits `text` across the hole on one line. */
const valueSize = (text: string, diameter: number) =>
  Math.round(
    Math.max(
      14,
      Math.min(diameter * 0.19, (diameter * 0.78) / (text.length * 0.6))
    )
  );

/** The donut's middle: the total, or the spotlit slice. */
const Centre = ({
  slice,
  total,
  label,
  format,
  diameter,
}: {
  slice: SliceGeometry | undefined;
  total: number;
  label: string;
  format: (value: number) => string;
  diameter: number;
}) => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
  >
    <div
      className="flex flex-col items-center gap-1.5"
      style={{ maxWidth: diameter * 0.86 }}
    >
      <span className="text-muted-foreground flex max-w-full items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] uppercase">
        {slice === undefined ? null : (
          <span
            className="size-2 shrink-0 rounded-[2px]"
            style={{ background: cssColor(slice.color) }}
          />
        )}
        <span className="truncate">{slice?.label ?? label}</span>
      </span>
      <span
        className="text-foreground leading-none font-semibold tracking-tight whitespace-nowrap tabular-nums"
        style={{ fontSize: valueSize(format(slice?.value ?? total), diameter) }}
      >
        {format(slice?.value ?? total)}
      </span>
      <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
        {slice === undefined ? "100%" : percent.format(slice.share)}
      </span>
    </div>
  </div>
);

/**
 * Pie mode's readout: a card over the spotlit slice, gliding between
 * slices by transform. Position is written in a layout effect so it can
 * centre on its own measured size.
 */
const PieReadout = ({
  slice,
  raster,
  cell,
  format,
}: {
  slice: SliceGeometry | undefined;
  raster: Raster;
  cell: number;
  format: (value: number) => string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [last, setLast] = useState(slice);
  if (slice !== undefined && slice !== last) {
    setLast(slice);
  }
  const shown = slice ?? last;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || shown === undefined) {
      return;
    }
    const middle = (shown.from + shown.to) / 2;
    const reach = shown.share > 0.5 ? 0.3 : 0.58;
    const centre = (raster.side / 2) * cell;
    const x = centre + Math.sin(middle) * raster.outer * reach * cell;
    const y = centre - Math.cos(middle) * raster.outer * reach * cell;
    el.style.transform = `translate3d(${Math.round(x - el.offsetWidth / 2)}px, ${Math.round(y - el.offsetHeight / 2)}px, 0)`;
  });
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        "bg-popover/95 text-popover-foreground border-border pointer-events-none absolute top-0 left-0 z-10 rounded-lg border px-2.5 py-2 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.6)] backdrop-blur-sm",
        GLIDE
      )}
      style={{ opacity: slice === undefined ? 0 : 1 }}
    >
      {shown === undefined ? null : (
        <>
          <div className="text-muted-foreground mb-1 flex items-center gap-1.5 font-mono text-[10px] tracking-wide whitespace-nowrap uppercase">
            <span
              className="size-2 shrink-0 rounded-[2px]"
              style={{ background: cssColor(shown.color) }}
            />
            {shown.label}
          </div>
          <div className="flex items-baseline gap-2 text-xs whitespace-nowrap">
            <span className="font-mono font-medium tabular-nums">
              {format(shown.value)}
            </span>
            <span className="text-muted-foreground font-mono tabular-nums">
              {percent.format(shown.share)}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

/** Legend rows: toggle buttons that spotlight on hover and lock on click. */
const Legend = ({
  slices,
  focus,
  locked,
  interactive,
  format,
  onHover,
  onLock,
  hidden,
}: {
  slices: readonly SliceGeometry[];
  focus: number | null;
  locked: number | null;
  interactive: boolean;
  format: (value: number) => string;
  onHover: (index: number | null) => void;
  onLock: (index: number | null) => void;
  hidden: boolean;
}) => (
  <div
    className={cn(
      "flex w-full max-w-80 min-w-0 flex-col gap-0.5 sm:w-auto sm:min-w-52 sm:flex-1",
      hidden && "sr-only"
    )}
    {...(interactive
      ? { "aria-label": "Slices", role: "group" }
      : { "aria-hidden": true })}
  >
    {slices.map((slice) => {
      const content = (
        <>
          <span
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{ background: cssColor(slice.color) }}
          />
          <span className="text-foreground min-w-0 flex-1 truncate text-left text-sm">
            {slice.label}
          </span>
          <span className="text-foreground font-mono text-xs tabular-nums">
            {format(slice.value)}
          </span>
          <span className="text-muted-foreground w-12 text-right font-mono text-xs tabular-nums">
            {percent.format(slice.share)}
          </span>
        </>
      );
      const rowClass = cn(
        "flex h-8 w-full items-center gap-3 rounded-md px-2 transition-[opacity,background-color] duration-150 ease-out",
        focus !== null && focus !== slice.index && "opacity-45"
      );
      if (!interactive) {
        return (
          <div key={slice.index} className={rowClass}>
            {content}
          </div>
        );
      }
      return (
        <button
          key={slice.index}
          type="button"
          aria-pressed={locked === slice.index}
          onPointerEnter={() => onHover(slice.index)}
          onPointerLeave={() => onHover(null)}
          onFocus={() => onHover(slice.index)}
          onBlur={() => onHover(null)}
          onClick={() => onLock(locked === slice.index ? null : slice.index)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              onLock(null);
            }
          }}
          className={cn(
            rowClass,
            "hover:bg-muted/60 focus-visible:ring-ring/60 aria-pressed:bg-muted cursor-pointer outline-none focus-visible:ring-2"
          )}
        >
          {content}
        </button>
      );
    })}
  </div>
);

/** Every slice, for screen readers. */
const DataTable = ({
  summary,
  slices,
  format,
}: {
  summary: string;
  slices: readonly SliceGeometry[];
  format: (value: number) => string;
}) => (
  <table className="sr-only">
    <caption>{summary}</caption>
    <thead>
      <tr>
        <th scope="col">Slice</th>
        <th scope="col">Value</th>
        <th scope="col">Share</th>
      </tr>
    </thead>
    <tbody>
      {slices.map((slice) => (
        <tr key={slice.index}>
          <th scope="row">{slice.label}</th>
          <td>{format(slice.value)}</td>
          <td>{percent.format(slice.share)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

/** Root props: a focusable, labelled group when interactive, else an image. */
const rootProps = ({
  interactive,
  uid,
  summary,
  onBlur,
  onKeyDown,
}: {
  interactive: boolean;
  uid: string;
  summary: string;
  onBlur: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}) =>
  interactive
    ? {
        "aria-describedby": `${uid}-keys`,
        "aria-label": summary,
        "aria-roledescription": "chart",
        onBlur,
        onKeyDown,
        role: "group",
        tabIndex: 0,
      }
    : { "aria-label": summary, role: "img" };

/**
 * A donut or pie chart drawn in dither cells. Each slice takes a colour
 * and a texture, capped with a solid rim; slices sweep in clockwise. Hover
 * a slice or its legend row to spotlight it (it steps outward and the
 * centre shows its value), click to keep it lit, and focus the chart to
 * step through slices with the arrow keys.
 */
export const DonutChart = ({
  data,
  label,
  mode = "donut",
  fill = "gradient",
  bloom = "off",
  colors,
  size = 220,
  thickness = 0.36,
  gap = 1,
  unit = "",
  format,
  legend = true,
  interactive = true,
  animate = true,
  matrix = "bayer4",
  cell,
  className,
  ...props
}: DonutChartProps) => {
  const ref = useRef<HTMLElement>(null);
  const uid = useId().replaceAll(":", "");
  const cellSize = useCellSize(ref, cell);
  const formatValue = useMemo(() => toFormatter(format, unit), [format, unit]);
  const { slices, total } = useMemo(
    () => toSlices({ colors, data, fill }),
    [colors, data, fill]
  );
  const raster = useMemo(
    () =>
      rasterise({
        cell: cellSize,
        gap,
        matrix,
        mode,
        size,
        slices,
        thickness,
      }),
    [cellSize, gap, matrix, mode, size, slices, thickness]
  );
  const sweep = useSweep(ref, animate);
  const paths = useMemo(
    () => slicePaths(raster, slices.length, sweep),
    [raster, slices.length, sweep]
  );
  const spotlight = useSpotlight(slices);
  const pointer = usePointerSlice({
    cell: cellSize,
    onPick: (hit) => spotlight.setLocked(hit === spotlight.locked ? null : hit),
    onSlice: spotlight.setHovered,
    raster,
    slices,
  });

  const focus = interactive ? spotlight.focus : null;
  const active = focus === null ? undefined : slices[focus];
  const drawn = raster.side * cellSize;
  const summary = `${mode === "pie" ? "Pie" : "Donut"} chart of ${label}: ${formatValue(total)} in total across ${String(slices.length)} slices.`;

  return (
    <figure
      ref={ref}
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-10 gap-y-6",
        className
      )}
      {...props}
    >
      <div
        className="focus-visible:ring-ring/60 relative shrink-0 rounded-full outline-none focus-visible:ring-2"
        style={{ height: drawn, width: drawn }}
        {...rootProps({
          interactive,
          onBlur: () => spotlight.setHovered(null),
          onKeyDown: spotlight.onKeyDown,
          summary,
          uid,
        })}
      >
        <svg
          aria-hidden="true"
          width={drawn}
          height={drawn}
          viewBox={`0 0 ${drawn} ${drawn}`}
          className={cn(
            "block overflow-visible",
            interactive && "cursor-pointer"
          )}
          {...(interactive ? pointer.handlers : {})}
        >
          <Slices
            slices={slices}
            paths={paths}
            cell={cellSize}
            bloom={bloom}
            focus={focus}
          />
        </svg>
        {mode === "donut" ? (
          <Centre
            slice={active}
            total={total}
            label={label}
            format={formatValue}
            diameter={raster.inner * 2 * cellSize}
          />
        ) : (
          <PieReadout
            slice={active}
            raster={raster}
            cell={cellSize}
            format={formatValue}
          />
        )}
      </div>
      <figcaption className="contents">
        <Legend
          slices={slices}
          focus={focus}
          locked={spotlight.locked}
          interactive={interactive}
          format={formatValue}
          onHover={spotlight.setHovered}
          onLock={spotlight.setLocked}
          hidden={!legend}
        />
      </figcaption>
      {interactive ? (
        <>
          <p id={`${uid}-keys`} className="sr-only">
            Use the arrow keys to move between slices, Enter to keep one lit,
            Escape to clear.
          </p>
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {active === undefined
              ? ""
              : `${active.label}: ${formatValue(active.value)}, ${percent.format(active.share)}`}
          </div>
        </>
      ) : null}
      <DataTable summary={summary} slices={slices} format={formatValue} />
    </figure>
  );
};
