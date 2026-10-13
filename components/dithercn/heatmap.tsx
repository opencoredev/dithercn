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
  useFrameLoop,
} from "@/lib/dither";
import type { Bloom, DitherColor } from "@/lib/dither";
import { cn } from "@/lib/utils";

export interface HeatmapDatum {
  /** The day, as `"YYYY-MM-DD"` or a `Date` (read in UTC). */
  date: string | Date;
  /** The day's value. Several entries for one day add up. */
  value: number;
}

interface HeatmapShared {
  /**
   * How many densities values map to, above empty, 2 to 6. With 4 the
   * squares step through dots, a checkerboard, a hollow frame and solid.
   * Default 4.
   */
  steps?: number;
  /** The value drawn solid; larger values draw solid too. Default: the largest value. */
  max?: number;
  /** What a value counts, for the readout: `"deploy"` or `{ one: "deploy", other: "deploys" }`. */
  unit?: string | { one: string; other: string };
  /** Ink colour: a palette name or any CSS colour. Default `ink`. */
  color?: DitherColor;
  /** Soft glow in the ink colour behind the densest squares: `off`, `low` or `high`. Default `off`. */
  bloom?: Bloom;
  /** Largest dither cell in CSS px; each square is 4×4 cells. Shrinks to 2 to fit. Default `--dither-cell`. */
  cell?: number;
  /** Show the Less/More scale. Default true. */
  legend?: boolean;
  /** Hover and keyboard readout, and the legend spotlight. `false` for decoration. Default true. */
  interactive?: boolean;
  /** Squares ripple in from the left on first view. Default true; off under reduced motion. */
  animate?: boolean;
}

/** One square per day, one column per week. */
export interface CalendarHeatmapProps extends HeatmapShared {
  mode?: "calendar";
  /** Values by day. Days without an entry count as 0. */
  data: readonly HeatmapDatum[];
  /** Weeks shown, ending with the latest day in `data`. On narrow screens the oldest drop off. Default 53. */
  weeks?: number;
  /** First row: 0 Sunday, 1 Monday. Default 0. */
  weekStart?: 0 | 1;
  rows?: never;
  columns?: never;
}

/** A grid of values, such as weekday by hour. */
export interface MatrixHeatmapProps extends HeatmapShared {
  mode: "matrix";
  /** Values by row, then column: `data[row][column]`. Missing values draw nothing. */
  data: readonly (readonly number[])[];
  /** Row labels, top to bottom. */
  rows: readonly string[];
  /** Column labels, left to right. Only as many as fit are shown. */
  columns: readonly string[];
  weeks?: never;
  weekStart?: never;
}

export type HeatmapProps = Omit<ComponentProps<"div">, "children"> &
  (CalendarHeatmapProps | MatrixHeatmapProps);

const DAY_MS = 86_400_000;
/** A square is 4×4 cells with one cell of gap: exactly one Bayer tile. */
const SQUARE = 4;
const PITCH = 5;
const TOP = 20;
const MIN_CELL = 2;
const DIMMED = 0.18;
const REVEAL_SECONDS = (MOTION.slow + MOTION.base * 2) / 1000;
const REVEAL_STEPS = 30;
const GLIDE =
  "transition-[transform,opacity] duration-200 ease-(--ease-out) motion-reduce:transition-none data-[glide=false]:transition-[opacity]";

const count = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const longDate = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  weekday: "short",
  year: "numeric",
});
const shortDate = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});
const monthName = new Intl.DateTimeFormat("en", {
  month: "short",
  timeZone: "UTC",
});
const weekdayName = new Intl.DateTimeFormat("en", {
  timeZone: "UTC",
  weekday: "short",
});

const withUnit = (value: number, unit: HeatmapShared["unit"]) => {
  const text = count.format(value);
  if (unit === undefined) {
    return text;
  }
  if (typeof unit === "string") {
    return `${text} ${unit}`;
  }
  return `${text} ${value === 1 ? unit.one : unit.other}`;
};

/** Days since the epoch, in UTC, so time zones never shift a square. */
const dayNumber = (date: string | Date) => {
  if (typeof date !== "string") {
    return Math.floor(date.getTime() / DAY_MS);
  }
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return Math.floor(
    Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1) / DAY_MS
  );
};
const dateOf = (day: number) => new Date(day * DAY_MS);

interface Square {
  column: number;
  row: number;
  value: number;
  /** 0 for empty, else 1 to `steps`. */
  bucket: number;
  /** Readout heading: the date, or "Mon · 14:00". */
  label: string;
}

interface GridModel {
  columns: number;
  rows: number;
  /** In-range squares, column by column. */
  squares: readonly Square[];
  /** Square at `column * rows + row`, or undefined outside the range. */
  at: (column: number, row: number) => Square | undefined;
  columnLabels: readonly { column: number; text: string }[];
  rowLabels: readonly { row: number; text: string }[];
  summary: string;
}

const bucketOf = (value: number, max: number, steps: number) =>
  value <= 0
    ? 0
    : Math.min(steps, Math.max(1, Math.ceil((value / max) * steps)));

const indexSquares = (squares: readonly Square[], rows: number) => {
  const lookup = new Map<number, Square>();
  for (const square of squares) {
    lookup.set(square.column * rows + square.row, square);
  }
  return (column: number, row: number) =>
    row < 0 || row >= rows || column < 0
      ? undefined
      : lookup.get(column * rows + row);
};

/** Month labels where a month starts, skipping ones too close to fit. */
const monthLabels = (firstDay: number, columns: number) => {
  const labels: { column: number; text: string }[] = [];
  let previousMonth = dateOf(firstDay).getUTCMonth();
  let previousColumn = -10;
  for (let column = 0; column < columns; column += 1) {
    const date = dateOf(firstDay + column * 7 + 6);
    const month = date.getUTCMonth();
    const starts =
      column === 0 ? date.getUTCDate() <= 7 : month !== previousMonth;
    // A label needs about three columns of room.
    if (starts && column - previousColumn >= 3 && column <= columns - 2) {
      labels.push({ column, text: monthName.format(date) });
      previousColumn = column;
    }
    previousMonth = month;
  }
  return labels;
};

const buildCalendar = ({
  data,
  weeks,
  weekStart,
  steps,
  max,
  unit,
}: {
  data: readonly HeatmapDatum[];
  weeks: number;
  weekStart: 0 | 1;
  steps: number;
  max: number | undefined;
  unit: HeatmapShared["unit"];
}): GridModel => {
  const totals = new Map<number, number>();
  for (const datum of data) {
    const day = dayNumber(datum.date);
    const value = Number.isFinite(datum.value) ? datum.value : 0;
    totals.set(day, (totals.get(day) ?? 0) + value);
  }
  const lastDay = totals.size > 0 ? Math.max(...totals.keys()) : 0;
  // Weekday of the last day, counted from `weekStart` (1970-01-01 was a Thursday).
  const lastRow = (((lastDay + 4 - weekStart) % 7) + 7) % 7;
  const columns = Math.max(1, weeks);
  const firstDay = lastDay - lastRow - (columns - 1) * 7;
  const peak = max ?? Math.max(1, ...totals.values());
  const squares: Square[] = [];
  let total = 0;
  let busiest: Square | undefined;
  for (let day = firstDay; day <= lastDay; day += 1) {
    const value = Math.max(0, totals.get(day) ?? 0);
    const offset = day - firstDay;
    const square = {
      bucket: bucketOf(value, peak, steps),
      column: Math.floor(offset / 7),
      label: longDate.format(dateOf(day)),
      row: offset % 7,
      value,
    };
    total += value;
    if (busiest === undefined || value > busiest.value) {
      busiest = square;
    }
    squares.push(square);
  }
  // Label Monday, Wednesday and Friday, wherever the week starts.
  const rowLabels = [1, 3, 5].map((weekday) => {
    const row = (weekday - weekStart + 7) % 7;
    return { row, text: weekdayName.format(dateOf(firstDay + row)) };
  });
  const busy =
    busiest === undefined || busiest.value <= 0
      ? ""
      : `, busiest ${busiest.label} with ${withUnit(busiest.value, unit)}`;
  return {
    at: indexSquares(squares, 7),
    columnLabels: monthLabels(firstDay, columns),
    columns,
    rowLabels,
    rows: 7,
    squares,
    summary: `Calendar heatmap, ${shortDate.format(dateOf(firstDay))} to ${shortDate.format(dateOf(lastDay))}: ${withUnit(total, unit)} in total${busy}.`,
  };
};

const buildMatrix = ({
  data,
  rows,
  columns,
  steps,
  max,
  unit,
}: {
  data: readonly (readonly number[])[];
  rows: readonly string[];
  columns: readonly string[];
  steps: number;
  max: number | undefined;
  unit: HeatmapShared["unit"];
}): GridModel => {
  const values = data.flatMap((row) =>
    row.filter((value) => Number.isFinite(value))
  );
  const peak = max ?? Math.max(1, ...values);
  const squares: Square[] = [];
  let busiest: Square | undefined;
  for (let column = 0; column < columns.length; column += 1) {
    for (let row = 0; row < rows.length; row += 1) {
      const raw = data[row]?.[column];
      if (raw !== undefined && Number.isFinite(raw)) {
        const value = Math.max(0, raw);
        const square = {
          bucket: bucketOf(value, peak, steps),
          column,
          label: `${rows[row] ?? ""} · ${columns[column] ?? ""}`,
          row,
          value,
        };
        if (busiest === undefined || value > busiest.value) {
          busiest = square;
        }
        squares.push(square);
      }
    }
  }
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  return {
    at: indexSquares(squares, rows.length),
    columnLabels: columns.map((text, column) => ({ column, text })),
    columns: columns.length,
    rowLabels: rows.map((text, row) => ({ row, text })),
    rows: rows.length,
    squares,
    summary: `Heatmap of ${String(rows.length)} rows by ${String(columns.length)} columns: ${withUnit(total, unit)} in total${busiest === undefined ? "" : `, highest at ${busiest.label} with ${withUnit(busiest.value, unit)}`}.`,
  };
};

/**
 * Hand-picked 4×4 masks, sparse to solid. A plain Bayer level cut to a
 * square reads as a glyph at three quarters, so the dense end uses a
 * hollow frame instead: every level keeps the square's outline crisp.
 */
const MASKS = {
  checker: ["#.#.", ".#.#", "#.#.", ".#.#"],
  dots: ["#.#.", "....", "#.#.", "...."],
  frame: ["####", "#..#", "#..#", "####"],
  pinhole: ["####", "#.##", "##.#", "####"],
  solid: ["####", "####", "####", "####"],
  sparse: ["....", ".#..", "..#.", "...."],
} as const satisfies Record<string, readonly [string, string, string, string]>;

type MaskName = keyof typeof MASKS;

/** The masks for 2 to 6 steps, lightest first. */
const STEP_MASKS: Readonly<Record<number, readonly MaskName[]>> = {
  2: ["checker", "solid"],
  3: ["dots", "checker", "solid"],
  4: ["dots", "checker", "frame", "solid"],
  5: ["sparse", "dots", "checker", "frame", "solid"],
  6: ["sparse", "dots", "checker", "frame", "pinhole", "solid"],
};

/** Whether cell (x, y) of a square is inked at `bucket` (1 to `steps`). */
const squareInked = (x: number, y: number, bucket: number, steps: number) => {
  const name = STEP_MASKS[steps]?.[bucket - 1];
  return name !== undefined && MASKS[name][y]?.[x] === "#";
};

/**
 * Paths in cell units: one faint backing path for every in-range square,
 * then one ink path per bucket. Squares past `reveal` (a 0..1 sweep that
 * runs as a diagonal from the top left) are left out.
 */
const gridPaths = ({
  squares,
  columns,
  rows,
  steps,
  reveal,
}: {
  squares: readonly Square[];
  columns: number;
  rows: number;
  steps: number;
  reveal: number;
}) => {
  const ink = Array.from({ length: steps + 1 }, () => "");
  let backing = "";
  const span = columns + rows * 0.8;
  for (const square of squares) {
    if ((square.column + square.row * 0.8) / span <= reveal) {
      const left = square.column * PITCH;
      const top = square.row * PITCH;
      backing += `M${left} ${top}h${SQUARE}v${SQUARE}h${-SQUARE}z`;
      for (let y = 0; y < SQUARE && square.bucket > 0; y += 1) {
        for (let x = 0; x < SQUARE; x += 1) {
          if (squareInked(x, y, square.bucket, steps)) {
            ink[square.bucket] += `M${left + x} ${top + y}h1v1h-1z`;
          }
        }
      }
    }
  }
  return { backing, ink };
};

const snapDown = (px: number) => {
  const dpr = window.devicePixelRatio || 1;
  return Math.max(1, Math.floor(px * dpr)) / dpr;
};

/** Width of the box and the largest cell that fits, 0 until measured. */
const useFit = (
  ref: { current: HTMLDivElement | null },
  cell: number | undefined
) => {
  const [box, setBox] = useState({ base: cell ?? 3, width: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setBox({
        base: cell ?? readDitherCell(el),
        width: Math.floor(entry?.contentRect.width ?? 0),
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, cell]);
  return box;
};

/** 0 → 1 over the entrance once on screen; 1 at once when off or reduced. */
const useReveal = (target: { current: Element | null }, enabled: boolean) => {
  const [progress, setProgress] = useState(enabled ? 0 : 1);
  useFrameLoop(
    (time) => {
      const linear = Math.min(1, time / REVEAL_SECONDS);
      setProgress(
        Math.round((1 - (1 - linear) ** 2) * REVEAL_STEPS) / REVEAL_STEPS
      );
    },
    { enabled: enabled && progress < 1, stillTime: REVEAL_SECONDS, target }
  );
  return progress;
};

interface Layout {
  cell: number;
  /** Columns that fit; calendars drop their oldest weeks to get here. */
  columns: number;
  left: number;
  /** Show every nth column label. */
  labelEvery: number;
}

const AXIS_CHAR = 6.1;

/** The cell size and visible columns for a box `width` px wide. */
const fitLayout = ({
  width,
  base,
  columns,
  rowLabels,
  columnLabels,
}: {
  width: number;
  base: number;
  columns: number;
  rowLabels: readonly string[];
  columnLabels: readonly string[];
}): Layout => {
  const left =
    Math.ceil(
      Math.max(0, ...rowLabels.map((text) => text.length)) * AXIS_CHAR
    ) + 8;
  const room = Math.max(0, width - left);
  const ideal = room / (columns * PITCH - 1);
  const cell = Math.max(MIN_CELL, Math.min(base, snapDown(ideal)));
  const fits = Math.max(1, Math.floor((room / cell + 1) / PITCH));
  const widest = Math.max(0, ...columnLabels.map((text) => text.length));
  return {
    cell,
    columns: Math.min(columns, fits),
    labelEvery:
      widest === 0
        ? 1
        : Math.max(1, Math.ceil((widest * AXIS_CHAR + 6) / (cell * PITCH))),
    left,
  };
};

const ARROWS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
};

interface Active {
  column: number;
  row: number;
  glide: boolean;
  visible: boolean;
}

/** The pointed or focused square, with rAF-throttled pointer moves. */
const useActiveSquare = ({
  model,
  layout,
  onEscape,
}: {
  model: GridModel;
  layout: Layout;
  onEscape: () => void;
}) => {
  const [active, setActive] = useState<Active | null>(null);
  const frame = useRef(0);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const pitch = layout.cell * PITCH;

  const point = (x: number, y: number) => {
    const column = Math.floor((x - layout.left) / pitch);
    const row = Math.floor((y - TOP) / pitch);
    if (model.at(column, row) === undefined) {
      setActive((current) =>
        current === null ? null : { ...current, glide: false, visible: false }
      );
      return;
    }
    setActive((current) =>
      current?.column === column && current.row === row && current.visible
        ? current
        : { column, glide: current?.visible === true, row, visible: true }
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
        point(pointer.current.x, pointer.current.y);
      }
    });
  };

  const hide = () =>
    setActive((current) =>
      current === null ? null : { ...current, glide: false, visible: false }
    );

  const onPointerLeave = () => {
    pointer.current = null;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    hide();
  };

  const last = model.squares.at(-1);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      hide();
      onEscape();
      return;
    }
    const from = active ?? { column: last?.column ?? 0, row: last?.row ?? 0 };
    const step = ARROWS[event.key];
    let target: Square | undefined;
    if (step !== undefined) {
      target = model.at(from.column + step[0], from.row + step[1]);
    } else if (event.key === "Home") {
      [target] = model.squares;
    } else if (event.key === "End") {
      target = last;
    } else {
      return;
    }
    event.preventDefault();
    // The docs bind the arrows to prev/next page; the grid owns them while focused.
    event.stopPropagation();
    if (target !== undefined) {
      setActive({
        column: target.column,
        glide: false,
        row: target.row,
        visible: true,
      });
    }
  };

  const onFocus = () =>
    setActive((current) =>
      current?.visible === true
        ? current
        : {
            column: current?.column ?? last?.column ?? 0,
            glide: false,
            row: current?.row ?? last?.row ?? 0,
            visible: true,
          }
    );

  return {
    active,
    handlers: { onBlur: hide, onFocus, onKeyDown },
    pointerHandlers: { onPointerLeave, onPointerMove },
  };
};

/** The readout card, placed over the active square by transform. */
const Readout = ({
  square,
  anchor,
  width,
  visible,
  glide,
  unit,
}: {
  square: Square | undefined;
  anchor: { x: number; y: number };
  width: number;
  visible: boolean;
  glide: boolean;
  unit: HeatmapShared["unit"];
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const left = Math.min(
      Math.max(0, anchor.x - el.offsetWidth / 2),
      Math.max(0, width - el.offsetWidth)
    );
    const above = anchor.y - el.offsetHeight - 8;
    el.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(above)}px, 0)`;
  });
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-glide={String(glide)}
      className={cn(
        "bg-popover/95 text-popover-foreground border-border pointer-events-none absolute top-0 left-0 z-10 rounded-lg border px-2.5 py-2 whitespace-nowrap shadow-[0_8px_24px_-12px_rgb(0_0_0/0.6)] backdrop-blur-sm",
        GLIDE
      )}
      style={{ opacity: visible ? 1 : 0 }}
    >
      {square === undefined ? null : (
        <>
          <div className="text-muted-foreground mb-1 font-mono text-[10px] tracking-wide uppercase">
            {square.label}
          </div>
          <div className="font-mono text-xs font-medium tabular-nums">
            {square.value > 0 ? withUnit(square.value, unit) : "None"}
          </div>
        </>
      )}
    </div>
  );
};

/** A 4×4 swatch of one bucket, drawn exactly like a square in the grid. */
const Swatch = ({
  bucket,
  steps,
  cell,
  color,
}: {
  bucket: number;
  steps: number;
  cell: number;
  color: DitherColor;
}) => {
  let path = "";
  for (let y = 0; y < SQUARE; y += 1) {
    for (let x = 0; x < SQUARE; x += 1) {
      if (squareInked(x, y, bucket, steps)) {
        path += `M${x} ${y}h1v1h-1z`;
      }
    }
  }
  const side = SQUARE * cell;
  return (
    <svg aria-hidden="true" width={side} height={side} className="block">
      <g transform={`scale(${cell})`} shapeRendering="crispEdges">
        <rect
          width={SQUARE}
          height={SQUARE}
          className="fill-foreground/[0.07]"
        />
        <path d={path} fill={cssColor(color)} />
      </g>
    </svg>
  );
};

/** Upper bound of each bucket, for the legend's labels. */
const bucketText = ({
  bucket,
  steps,
  max,
  unit,
}: {
  bucket: number;
  steps: number;
  max: number;
  unit: HeatmapShared["unit"];
}) => {
  if (bucket === 0) {
    return "None";
  }
  const low = (max * (bucket - 1)) / steps;
  if (bucket === steps) {
    return `More than ${withUnit(low, unit)}`;
  }
  return `Up to ${withUnit((max * bucket) / steps, unit)}`;
};

/** Less … More: one toggle per density that spotlights its squares. */
const Legend = ({
  steps,
  cell,
  color,
  focus,
  locked,
  interactive,
  max,
  unit,
  onHover,
  onLock,
}: {
  steps: number;
  cell: number;
  color: DitherColor;
  focus: number | null;
  locked: number | null;
  interactive: boolean;
  max: number;
  unit: HeatmapShared["unit"];
  onHover: (bucket: number | null) => void;
  onLock: (bucket: number | null) => void;
}) => (
  <div className="text-muted-foreground mt-3 flex items-center justify-end gap-1.5 font-mono text-[10px]">
    <span className="mr-0.5">Less</span>
    <div
      className="flex items-center gap-0.5"
      {...(interactive
        ? { "aria-label": "Levels", role: "group" }
        : { "aria-hidden": true })}
    >
      {Array.from({ length: steps + 1 }, (_, bucket) => {
        const swatch = (
          <Swatch bucket={bucket} steps={steps} cell={cell} color={color} />
        );
        const dim = focus !== null && focus !== bucket && "opacity-35";
        if (!interactive) {
          return (
            <span key={bucket} className={cn("p-1", dim)}>
              {swatch}
            </span>
          );
        }
        return (
          <button
            key={bucket}
            type="button"
            aria-pressed={locked === bucket}
            aria-label={bucketText({ bucket, max, steps, unit })}
            title={bucketText({ bucket, max, steps, unit })}
            onPointerEnter={() => onHover(bucket)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(bucket)}
            onBlur={() => onHover(null)}
            onClick={() => onLock(locked === bucket ? null : bucket)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                onLock(null);
              }
            }}
            className={cn(
              "focus-visible:ring-ring/60 aria-pressed:ring-foreground/40 cursor-pointer rounded-[3px] p-1 transition-opacity duration-150 ease-out outline-none focus-visible:ring-2 aria-pressed:ring-1",
              dim
            )}
          >
            {swatch}
          </button>
        );
      })}
    </div>
    <span className="ml-0.5">More</span>
  </div>
);

/** Month or column labels above the grid, and row labels to its left. */
const AxisLabels = ({
  model,
  layout,
  offset,
}: {
  model: GridModel;
  layout: Layout;
  offset: number;
}) => {
  const pitch = layout.cell * PITCH;
  return (
    <g
      aria-hidden="true"
      className="fill-muted-foreground font-mono text-[10px]"
    >
      {model.columnLabels.map(({ column, text }) => {
        const shown = column - offset;
        return shown >= 0 &&
          shown < layout.columns &&
          shown % layout.labelEvery === 0 ? (
          <text key={column} x={layout.left + shown * pitch} y={TOP - 7}>
            {text}
          </text>
        ) : null;
      })}
      {model.rowLabels.map(({ row, text }) => (
        <text
          key={row}
          x={0}
          y={TOP + row * pitch + (SQUARE * layout.cell) / 2}
          dy="0.34em"
        >
          {text}
        </text>
      ))}
    </g>
  );
};

/** The model for either mode. */
const buildModel = (props: HeatmapProps, steps: number) =>
  props.mode === "matrix"
    ? buildMatrix({
        columns: props.columns,
        data: props.data,
        max: props.max,
        rows: props.rows,
        steps,
        unit: props.unit,
      })
    : buildCalendar({
        data: props.data,
        max: props.max,
        steps,
        unit: props.unit,
        weekStart: props.weekStart ?? 0,
        weeks: props.weeks ?? 53,
      });

/** Drop the first `offset` columns (the oldest weeks) from a model. */
const shiftModel = (model: GridModel, offset: number): GridModel => {
  if (offset <= 0) {
    return model;
  }
  const squares = model.squares
    .filter((square) => square.column >= offset)
    .map((square) => ({ ...square, column: square.column - offset }));
  return {
    ...model,
    at: indexSquares(squares, model.rows),
    columns: model.columns - offset,
    squares,
  };
};

/** The div props left after the mode-specific ones are taken out. */
const withoutModeProps = ({
  mode: _mode,
  data: _data,
  weeks: _weeks,
  weekStart: _weekStart,
  rows: _rows,
  columns: _columns,
  ...props
}: Omit<HeatmapProps, keyof HeatmapShared | "className" | "aria-label">) =>
  props;

/** A focusable group labelled with the summary and the key help. */
const groupProps = (uid: string, label: string) => ({
  "aria-describedby": `${uid}-keys`,
  "aria-label": label,
  "aria-roledescription": "heatmap",
  role: "group",
  tabIndex: 0,
});

/** Key help and a live readout for screen readers. */
const ScreenReaderStatus = ({ id, text }: { id: string; text: string }) => (
  <>
    <p id={id} className="sr-only">
      Use the arrow keys to move between squares, Home and End to jump to the
      first and last, Escape to clear.
    </p>
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {text}
    </div>
  </>
);

/** The grid itself: labels, squares, the hover outline and the readout. */
const Grid = ({
  model,
  layout,
  offset,
  paths,
  steps,
  color,
  bloom,
  focusBucket,
  interactive,
  scrub,
  unit,
  label,
  uid,
}: {
  model: GridModel;
  layout: Layout;
  offset: number;
  paths: { backing: string; ink: readonly string[] };
  steps: number;
  color: DitherColor;
  bloom: Bloom;
  focusBucket: number | null;
  interactive: boolean;
  scrub: ReturnType<typeof useActiveSquare>;
  unit: HeatmapShared["unit"];
  label: string;
  uid: string;
}) => {
  const pitch = layout.cell * PITCH;
  const width = layout.left + model.columns * pitch - layout.cell;
  const height = TOP + model.rows * pitch - layout.cell;
  const {
    column,
    row,
    glide,
    visible: shown,
  } = scrub.active ?? { column: 0, glide: false, row: 0, visible: false };
  const square = model.at(column, row);
  const visible = interactive && shown && square !== undefined;
  const ink = cssColor(color);
  return (
    <div
      {...(interactive
        ? {
            ...scrub.handlers,
            ...groupProps(uid, label),
          }
        : { "aria-label": label, role: "img" })}
      className="focus-visible:ring-ring/60 relative rounded-sm outline-none focus-visible:ring-2"
      style={{ height, width }}
    >
      <svg
        aria-hidden="true"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block overflow-visible select-none"
        {...(interactive ? scrub.pointerHandlers : {})}
      >
        <AxisLabels model={model} layout={layout} offset={offset} />
        <g transform={`translate(${layout.left} ${TOP})`}>
          <g transform={`scale(${layout.cell})`} shapeRendering="crispEdges">
            <path d={paths.backing} className="fill-foreground/[0.07]" />
            <BloomGroup bloom={bloom}>
              <path
                d={`${paths.ink[steps] ?? ""}${paths.ink[steps - 1] ?? ""}`}
                fill={ink}
              />
            </BloomGroup>
            {paths.ink.map((path, bucket) =>
              bucket === 0 ? null : (
                <path
                  // oxlint-disable-next-line react/no-array-index-key -- the bucket is the identity.
                  key={bucket}
                  d={path}
                  fill={ink}
                  className="transition-opacity duration-150 ease-out motion-reduce:transition-none"
                  style={{
                    opacity:
                      focusBucket === null || focusBucket === bucket
                        ? 1
                        : DIMMED,
                  }}
                />
              )
            )}
          </g>
          {interactive ? (
            <rect
              data-glide={String(glide)}
              x={-1.5}
              y={-1.5}
              width={SQUARE * layout.cell + 3}
              height={SQUARE * layout.cell + 3}
              rx={1}
              fill="none"
              className={cn("stroke-foreground", GLIDE)}
              strokeWidth={1}
              style={{
                opacity: visible ? 1 : 0,
                transform: `translate(${column * pitch}px, ${row * pitch}px)`,
              }}
            />
          ) : null}
        </g>
      </svg>
      {interactive ? (
        <Readout
          square={square}
          anchor={{
            x: layout.left + column * pitch + (SQUARE * layout.cell) / 2,
            y: TOP + row * pitch - 2,
          }}
          width={width}
          visible={visible}
          glide={glide}
          unit={unit}
        />
      ) : null}
      {interactive ? (
        <ScreenReaderStatus
          id={`${uid}-keys`}
          text={
            visible
              ? `${square.label}: ${square.value > 0 ? withUnit(square.value, unit) : "none"}`
              : ""
          }
        />
      ) : null}
    </div>
  );
};

/**
 * A heatmap built from dither cells. Every square is a 4×4 block of
 * cells, so its density steps cleanly from dots to solid. Calendar mode
 * draws a day per square and a week per column; matrix mode draws any
 * grid, such as weekday by hour. Hover or arrow through squares for a
 * readout; hover a legend level to spotlight its squares.
 */
export const Heatmap = (allProps: HeatmapProps) => {
  const {
    steps: rawSteps = 4,
    max,
    unit,
    color = "ink",
    bloom = "off",
    cell,
    legend = true,
    interactive = true,
    animate = true,
    className,
    "aria-label": ariaLabel,
    ...rest
  } = allProps;
  const steps = Math.min(6, Math.max(2, Math.round(rawSteps)));
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId().replaceAll(":", "");
  const box = useFit(ref, cell);
  const reveal = useReveal(ref, animate);
  const [hoveredBucket, setHoveredBucket] = useState<number | null>(null);
  const [lockedBucket, setLockedBucket] = useState<number | null>(null);
  const focusBucket = interactive ? (hoveredBucket ?? lockedBucket) : null;

  const full = useMemo(() => buildModel(allProps, steps), [allProps, steps]);
  const layout = fitLayout({
    base: box.base,
    // Month labels are spaced already; matrix labels thin out to fit.
    columnLabels:
      allProps.mode === "matrix"
        ? full.columnLabels.map(({ text }) => text)
        : [],
    columns: full.columns,
    rowLabels: full.rowLabels.map(({ text }) => text),
    width: box.width,
  });
  const offset = full.columns - layout.columns;
  const model = useMemo(() => shiftModel(full, offset), [full, offset]);
  const paths = useMemo(
    () =>
      gridPaths({
        columns: model.columns,
        reveal,
        rows: model.rows,
        squares: model.squares,
        steps,
      }),
    [model, reveal, steps]
  );
  const scrub = useActiveSquare({
    layout,
    model,
    onEscape: () => setLockedBucket(null),
  });

  return (
    <div
      {...withoutModeProps(rest)}
      className={cn("relative w-full", className)}
    >
      <div ref={ref} className="relative w-full">
        {box.width === 0 ? (
          <div style={{ height: TOP + model.rows * PITCH * layout.cell }} />
        ) : (
          <Grid
            model={model}
            layout={layout}
            offset={offset}
            paths={paths}
            steps={steps}
            color={color}
            bloom={bloom}
            focusBucket={focusBucket}
            interactive={interactive}
            scrub={scrub}
            unit={unit}
            label={ariaLabel ?? model.summary}
            uid={uid}
          />
        )}
      </div>
      {legend ? (
        <Legend
          steps={steps}
          cell={layout.cell}
          color={color}
          focus={focusBucket}
          locked={lockedBucket}
          interactive={interactive}
          max={max ?? Math.max(1, ...model.squares.map(({ value }) => value))}
          unit={unit}
          onHover={setHoveredBucket}
          onLock={setLockedBucket}
        />
      ) : null}
    </div>
  );
};
