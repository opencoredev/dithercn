"use client";

import { Slider } from "radix-ui";
import { useId, useLayoutEffect, useRef, useState } from "react";
import type { ComponentProps, CSSProperties, RefObject } from "react";

import {
  bloomFilter,
  cssColor,
  fillStyle,
  getThresholdMap,
  MOTION,
} from "@/lib/dither";
import type { Bloom, DitherColor, DitherMatrix } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * The filled part of the track is a Bayer ramp worked out cell by cell:
 * sparse far from the thumb, denser towards it, and solid for the last
 * two cells before a one-cell gap at the thumb. The cells sit on the
 * track's own grid, so dragging flips cells through their thresholds
 * instead of sliding a texture under the thumb. With two thumbs the ramp
 * runs in from both ends. Hover, keyboard focus and drag fade in a longer,
 * denser ramp over the resting one (Bayer sets nest, so it only adds
 * cells). The thumb is a pixel-notched cap lit like Dither Button: a
 * highlight dithered down from the top, a shade dithered up from the
 * bottom and a grip line, brighter on hover and pressed in while dragged.
 * Only opacity animates.
 */

export type DitherSliderSize = "sm" | "md" | "lg";

/** Track height and thumb size in CSS pixels, before snapping to cells. */
const SIZES = {
  lg: { thumbHeight: 30, thumbWidth: 22, track: 12 },
  md: { thumbHeight: 24, thumbWidth: 18, track: 8 },
  sm: { thumbHeight: 20, thumbWidth: 14, track: 6 },
} as const satisfies Record<
  DitherSliderSize,
  { thumbHeight: number; thumbWidth: number; track: number }
>;

/** How the fill thins out behind a thumb, in cells and coverage. */
interface Ramp {
  /** Cells from the solid edge to the floor. */
  length: number;
  /** Coverage past the fade. */
  floor: number;
}

const REST: Ramp = { floor: 2 / 16, length: 30 };
/** Hover, focus and drag: twice as long, and a denser floor. */
const HOT: Ramp = { floor: 5 / 16, length: 60 };
/** Solid cells at the thumb end of the ramp. */
const SOLID = 2;
/** Paper cells between the ramp and the thumb's edge. */
const GAP = 1;
/** `ticks` past this many marks are ignored: they would read as a solid line. */
const MAX_TICKS = 101;

interface Geometry {
  cell: number;
  /** Track height in cells. */
  rows: number;
  thumbWidth: number;
  thumbHeight: number;
}

/** Sizes snapped to whole cells, with an odd thumb width so the grip sits in the middle. */
const geometryOf = (size: DitherSliderSize, cell: number): Geometry => {
  const spec = SIZES[size];
  const rows = Math.max(2, Math.round(spec.track / cell));
  const across = Math.max(3, Math.round(spec.thumbWidth / cell));
  const tall = Math.max(rows + 4, Math.round(spec.thumbHeight / cell));
  return {
    cell,
    rows,
    thumbHeight: tall * cell,
    thumbWidth: (across % 2 === 0 ? across + 1 : across) * cell,
  };
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** A rectangle with one notch cut from each corner, as a CSS `path()` body. */
const notched = (width: number, height: number, notch: number, inset = 0) => {
  const [l, t, r, b] = [inset, inset, width - inset, height - inset];
  return `M${l + notch} ${t}H${r - notch}V${t + notch}H${r}V${b - notch}H${r - notch}V${b}H${l + notch}V${b - notch}H${l}V${t + notch}H${l + notch}Z`;
};

const clipOf = (width: number, height: number, notch: number) =>
  `path("${notched(width, height, notch)}")`;

/** A run of filled cells. The ramp is densest at `end`, and at `start` too when `both`. */
interface Run {
  start: number;
  end: number;
  both: boolean;
}

/**
 * One SVG path, in cell units, covering the inked cells of every run: a
 * cell is inked when the ramp's coverage there is above its threshold.
 * The track's corner cells stay empty to match its notched ends.
 */
const rampPath = ({
  runs,
  cols,
  rows,
  ramp,
  matrix,
}: {
  runs: readonly Run[];
  cols: number;
  rows: number;
  ramp: Ramp;
  matrix: DitherMatrix;
}) => {
  const { size, thresholds } = getThresholdMap(matrix);
  const levelAt = (distance: number) =>
    distance < SOLID
      ? 1
      : Math.max(
          ramp.floor,
          1 - ((distance - SOLID + 0.5) / ramp.length) * (1 - ramp.floor)
        );
  let path = "";
  for (const { start, end, both } of runs) {
    const from = Math.max(0, start);
    const to = Math.min(cols, end);
    for (let y = 0; y < rows; y += 1) {
      let open = -1;
      for (let x = from; x <= to; x += 1) {
        const corner =
          (x === 0 || x === cols - 1) && (y === 0 || y === rows - 1);
        const distance = both ? Math.min(x - start, end - 1 - x) : end - 1 - x;
        const on =
          x < to &&
          !corner &&
          levelAt(distance) > (thresholds[(y % size) * size + (x % size)] ?? 1);
        if (on && open === -1) {
          open = x;
        } else if (!on && open !== -1) {
          path += `M${open} ${y}h${x - open}v1h${open - x}z`;
          open = -1;
        }
      }
    }
  }
  return path;
};

/** The track's width in CSS pixels, or `null` before the first layout. */
const useWidth = (ref: RefObject<HTMLElement | null>) => {
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    // Layout size, not getBoundingClientRect: a scaled preview frame must
    // not change the cell count.
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
};

/** Where the thumbs' centres sit: Radix keeps the thumb inside the track. */
const centreCss = (ratio: number, thumbWidth: number) =>
  `calc(${thumbWidth / 2}px + ${ratio} * (100% - ${thumbWidth}px))`;

const centrePx = (ratio: number, width: number, thumbWidth: number) =>
  thumbWidth / 2 + ratio * (width - thumbWidth);

/** Cell runs for one thumb (from the start) or two (between them). */
const runsOf = ({
  ratios,
  width,
  geometry,
}: {
  ratios: readonly number[];
  width: number;
  geometry: Geometry;
}): Run[] => {
  const { cell, thumbWidth } = geometry;
  const half = thumbWidth / 2 / cell;
  const centres = ratios.map(
    (ratio) => centrePx(ratio, width, thumbWidth) / cell
  );
  const [first] = centres;
  const last = centres.at(-1);
  if (first === undefined || last === undefined) {
    return [];
  }
  if (centres.length === 1) {
    return [{ both: false, end: Math.round(first - half) - GAP, start: 0 }];
  }
  return [
    {
      both: true,
      end: Math.round(last - half) - GAP,
      start: Math.round(first + half) + GAP,
    },
  ];
};

const STYLES = [
  `.dcn-sld-hot,.dcn-sld-lit,.dcn-sld-press,.dcn-sld-ring{opacity:0;transition:opacity 220ms ${MOTION.ease}}`,
  `.dcn-sld-tick{transition:background-color ${MOTION.fast}ms ${MOTION.ease}}`,
  "@media (hover:hover){.dcn-sld:not([data-disabled]):hover .dcn-sld-hot,.dcn-sld:not([data-disabled]) .dcn-sld-thumb:hover .dcn-sld-lit{opacity:1}}",
  ".dcn-sld:not([data-pointer]):has(.dcn-sld-thumb:focus-visible) .dcn-sld-hot,.dcn-sld[data-dragging] .dcn-sld-hot,.dcn-sld:not([data-pointer]) .dcn-sld-thumb:focus-visible :is(.dcn-sld-lit,.dcn-sld-ring){opacity:1}",
  ".dcn-sld[data-dragging] .dcn-sld-thumb:focus .dcn-sld-press{opacity:1;transition-duration:80ms}",
  ".dcn-sld[data-dragging] .dcn-sld-thumb:focus .dcn-sld-lit{opacity:0;transition-duration:80ms}",
  "@media (prefers-reduced-motion:reduce){.dcn-sld-hot,.dcn-sld-lit,.dcn-sld-press,.dcn-sld-ring,.dcn-sld-tick{transition:none}}",
].join("");

/** The filled cells: the resting ramp, with the denser one over it. */
const Fill = ({
  runs,
  cols,
  geometry,
  color,
  bloom,
  matrix,
}: {
  runs: readonly Run[];
  cols: number;
  geometry: Geometry;
  color: DitherColor;
  bloom: Bloom;
  matrix: DitherMatrix;
}) => {
  const { cell, rows } = geometry;
  const shared = { cols, matrix, rows, runs };
  const svg = {
    "aria-hidden": true,
    className: "absolute top-0 left-0 overflow-visible",
    height: rows * cell,
    shapeRendering: "crispEdges",
    viewBox: `0 0 ${cols} ${rows}`,
    width: cols * cell,
  } as const;
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0"
      style={{ filter: bloomFilter(color, bloom) }}
    >
      <svg {...svg}>
        <path d={rampPath({ ...shared, ramp: REST })} fill={cssColor(color)} />
      </svg>
      <svg {...svg} className={cn(svg.className, "dcn-sld-hot")}>
        <path d={rampPath({ ...shared, ramp: HOT })} fill={cssColor(color)} />
      </svg>
    </span>
  );
};

/**
 * The fill before the track has been measured (server render, first
 * frame): the same ramp drawn with CSS masks at percentage positions.
 */
const FallbackFill = ({
  ratios,
  geometry,
  color,
}: {
  ratios: readonly number[];
  geometry: Geometry;
  color: DitherColor;
}) => {
  const { cell, thumbWidth } = geometry;
  const ramp = (edge: "left" | "right") =>
    fillStyle("gradient", {
      cell,
      color,
      edge,
      from: 1,
      length: REST.length,
      to: REST.floor,
    });
  const first = ratios[0] ?? 0;
  const last = ratios.at(-1) ?? 0;
  if (ratios.length === 1) {
    return (
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0"
        style={{ width: centreCss(first, thumbWidth), ...ramp("right") }}
      />
    );
  }
  const left = centreCss(first, thumbWidth);
  return (
    <span
      aria-hidden="true"
      className="absolute inset-y-0 flex"
      style={{ left, width: `calc(${centreCss(last, thumbWidth)} - ${left})` }}
    >
      <span className="h-full w-1/2" style={ramp("left")} />
      <span className="h-full w-1/2" style={ramp("right")} />
    </span>
  );
};

interface Shades {
  base: string;
  light: string;
  dark: string;
}

const shadesOf = (color: DitherColor): Shades => {
  const base = cssColor(color);
  return {
    base,
    dark: `color-mix(in oklab, ${base}, black 48%)`,
    light: `color-mix(in oklab, ${base}, white 42%)`,
  };
};

const LAYER = "pointer-events-none absolute inset-0";

/** The lit cap inside each Radix thumb, with its focus ring. */
const ThumbSurface = ({
  geometry,
  color,
  bloom,
}: {
  geometry: Geometry;
  color: DitherColor;
  bloom: Bloom;
}) => {
  const { cell, thumbWidth: width, thumbHeight: height } = geometry;
  const rows = height / cell;
  const shades = shadesOf(color);
  const ramp = (
    edge: "top" | "bottom",
    tone: string,
    share: number,
    from = 1
  ) =>
    fillStyle("gradient", {
      cell,
      color: tone,
      edge,
      from,
      length: Math.max(2, Math.round(rows * share)),
      to: 0,
    });
  // The ring sits a 1px gap outside the cap, 2px thick, following its notches.
  const ring = `path(evenodd, "${notched(width + 6, height + 6, cell)} ${notched(width + 6, height + 6, cell, 2)}")`;
  return (
    <>
      <span
        aria-hidden="true"
        className="dcn-sld-ring pointer-events-none absolute -inset-[3px] bg-ring"
        style={{ clipPath: ring }}
      />
      <span
        aria-hidden="true"
        className={LAYER}
        style={{ filter: bloomFilter(color, bloom) }}
      >
        {/* A darker hairline holds the edge on any background. */}
        <span
          className={LAYER}
          style={{
            backgroundColor: `color-mix(in oklab, ${shades.base}, black 30%)`,
            clipPath: clipOf(width, height, cell),
          }}
        />
        <span
          className="pointer-events-none absolute inset-px overflow-hidden"
          style={{
            backgroundColor: shades.base,
            boxShadow: `inset 0 1px 0 color-mix(in oklab, ${shades.base}, white 55%)`,
            clipPath: clipOf(width - 2, height - 2, cell),
          }}
        >
          <span className={LAYER} style={ramp("bottom", shades.dark, 0.5)} />
          <span className={LAYER} style={ramp("top", shades.light, 0.22)} />
          <span
            className={cn(LAYER, "dcn-sld-lit")}
            style={ramp("top", shades.light, 0.7)}
          />
          <span
            className={cn(LAYER, "dcn-sld-press")}
            style={ramp("top", shades.dark, 0.45, 0.5)}
          />
          {/* The grip: one cell wide, down the middle third. */}
          <span
            className="pointer-events-none absolute left-1/2 -translate-x-1/2"
            style={{
              backgroundColor: shades.dark,
              height: Math.round(rows / 3) * cell,
              top: `calc(50% - ${(Math.round(rows / 3) * cell) / 2}px)`,
              width: cell,
            }}
          />
        </span>
      </span>
    </>
  );
};

/** The values `ticks` asks for, inside the range. */
const tickValues = ({
  ticks,
  min,
  max,
  step,
}: {
  ticks: boolean | readonly number[];
  min: number;
  max: number;
  step: number;
}): number[] => {
  if (ticks === false) {
    return [];
  }
  if (ticks === true) {
    const count = Math.floor((max - min) / step + 1e-9) + 1;
    return count > MAX_TICKS || step <= 0
      ? []
      : Array.from({ length: count }, (_, index) => min + index * step);
  }
  return ticks.filter((tick) => tick >= min && tick <= max);
};

/** Tick marks under the track, inked inside the selected range. */
const Ticks = ({
  values,
  selected,
  ratioOf,
  width,
  geometry,
  color,
}: {
  values: readonly number[];
  selected: readonly [number, number];
  ratioOf: (value: number) => number;
  width: number | null;
  geometry: Geometry;
  color: DitherColor;
}) => {
  const { cell, thumbWidth } = geometry;
  const ink = cssColor(color);
  return (
    <div
      aria-hidden="true"
      className="relative"
      style={{ height: cell * 2, marginTop: cell * 2 }}
    >
      {values.map((tick) => {
        const ratio = ratioOf(tick);
        const on = tick >= selected[0] && tick <= selected[1];
        // Measured: snap the mark onto the track's cell grid.
        const position: CSSProperties =
          width === null
            ? { left: centreCss(ratio, thumbWidth), translate: "-50% 0" }
            : {
                left:
                  Math.round(
                    (centrePx(ratio, width, thumbWidth) - cell / 2) / cell
                  ) * cell,
              };
        return (
          <span
            key={tick}
            className="dcn-sld-tick absolute top-0 h-full"
            style={{
              backgroundColor: on
                ? ink
                : `color-mix(in oklab, ${ink} 28%, transparent)`,
              width: cell,
              ...position,
            }}
          />
        );
      })}
    </div>
  );
};

type RootProps = Omit<
  ComponentProps<typeof Slider.Root>,
  "asChild" | "children" | "color" | "dir" | "inverted" | "orientation"
>;

interface OwnProps {
  /** What the slider sets. Shown above the track and used as the accessible name. */
  label: string;
  /** Keep the label and readout for screen readers only. Default `false`. */
  hideLabel?: boolean;
  /** Show the current value (or range) beside the label. Default `true`. */
  showValue?: boolean;
  /** Show `min` and `max` under the ends of the track. Default `false`. */
  showRange?: boolean;
  /** Tick marks under the track: `true` for one per step, or the values to mark. Default `false`. */
  ticks?: boolean | readonly number[];
  /** Shown after each value, such as `"%"` or `" ms"`. */
  unit?: string;
  /** `Intl.NumberFormat` options for values. Default: up to one decimal. */
  format?: Intl.NumberFormatOptions;
  /** Accessible names for each thumb. Default: the label, or `"<label>, minimum"` and `"<label>, maximum"` for two. */
  thumbLabels?: readonly string[];
  /** A palette name or any CSS colour. Default `"ink"`. */
  color?: DitherColor;
  /** Track and thumb size. Default `"md"`. */
  size?: DitherSliderSize;
  /** A soft glow in the slider's colour behind the fill and thumbs. Default `"off"`. */
  bloom?: Bloom;
  /** Threshold matrix of the ramp. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Size of one dither cell in CSS pixels. Default 2. */
  cell?: number;
}

export type DitherSliderProps = OwnProps & RootProps;

const thumbLabel = ({
  index,
  count,
  label,
  thumbLabels,
}: {
  index: number;
  count: number;
  label: string;
  thumbLabels: readonly string[] | undefined;
}) => {
  const custom = thumbLabels?.[index];
  if (custom !== undefined) {
    return custom;
  }
  if (count === 2) {
    return `${label}, ${index === 0 ? "minimum" : "maximum"}`;
  }
  return count > 2 ? `${label}, ${index + 1} of ${count}` : label;
};

/** The label, and the live value beside it. */
const Header = ({
  id,
  label,
  readout,
  hideLabel,
}: {
  id: string;
  label: string;
  readout: string | null;
  hideLabel: boolean;
}) => (
  <div
    className={cn(
      "flex items-baseline justify-between gap-4 text-sm",
      hideLabel && "sr-only"
    )}
  >
    <span id={id} className="text-foreground min-w-0 truncate">
      {label}
    </span>
    {readout === null ? null : (
      <span
        aria-hidden="true"
        className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums"
      >
        {readout}
      </span>
    )}
  </div>
);

/** The faint, notched track and the ramp on it. */
const TrackFill = ({
  width,
  ratios,
  geometry,
  color,
  bloom,
  matrix,
}: {
  width: number | null;
  ratios: readonly number[];
  geometry: Geometry;
  color: DitherColor;
  bloom: Bloom;
  matrix: DitherMatrix;
}) => {
  const { cell, rows } = geometry;
  const tint = `color-mix(in oklab, ${cssColor(color)} 15%, transparent)`;
  if (width === null) {
    return (
      <>
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{ backgroundColor: tint }}
        />
        <FallbackFill ratios={ratios} geometry={geometry} color={color} />
      </>
    );
  }
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundColor: tint,
          clipPath: clipOf(width, rows * cell, cell),
        }}
      />
      <Fill
        runs={runsOf({ geometry, ratios, width })}
        cols={Math.floor(width / cell)}
        geometry={geometry}
        color={color}
        bloom={bloom}
        matrix={matrix}
      />
    </>
  );
};

type RootPointerEvent = Parameters<NonNullable<RootProps["onPointerDown"]>>[0];

type RootKeyboardEvent = Parameters<NonNullable<RootProps["onKeyDown"]>>[0];
type RootFocusEvent = Parameters<NonNullable<RootProps["onBlur"]>>[0];

/**
 * `data-dragging` while a pointer holds the slider, and `data-pointer`
 * from a press until the next key or until focus leaves the slider, so the focus ring and the keyboard
 * ramp only show for keyboard users (Radix focuses the thumb on press,
 * which Chrome counts as `:focus-visible`). Chained after the caller's
 * handlers.
 */
const useDragging = ({
  disabled,
  onPointerDown,
  onPointerUp,
  onLostPointerCapture,
  onKeyDown,
  onBlur,
}: Pick<
  RootProps,
  | "disabled"
  | "onPointerDown"
  | "onPointerUp"
  | "onLostPointerCapture"
  | "onKeyDown"
  | "onBlur"
>) => {
  const [dragging, setDragging] = useState(false);
  const [pointer, setPointer] = useState(false);
  const handlers = {
    onBlur: (event: RootFocusEvent) => {
      onBlur?.(event);
      // Tabbing back in later is a keyboard visit: show the focus ring.
      const next = event.relatedTarget;
      if (!(next instanceof Node && event.currentTarget.contains(next))) {
        setPointer(false);
      }
    },
    onKeyDown: (event: RootKeyboardEvent) => {
      onKeyDown?.(event);
      setPointer(false);
    },
    onLostPointerCapture: (event: RootPointerEvent) => {
      onLostPointerCapture?.(event);
      setDragging(false);
    },
    onPointerDown: (event: RootPointerEvent) => {
      onPointerDown?.(event);
      setDragging(disabled !== true);
      setPointer(true);
    },
    onPointerUp: (event: RootPointerEvent) => {
      onPointerUp?.(event);
      setDragging(false);
    },
  };
  return {
    "data-dragging": dragging ? "" : undefined,
    "data-pointer": pointer ? "" : undefined,
    ...handlers,
  };
};

/** Tick marks and the min and max labels, under the track. */
const Footer = ({
  marks,
  range,
  text,
  ...ticks
}: Omit<ComponentProps<typeof Ticks>, "values"> & {
  marks: readonly number[];
  range: readonly [number, number] | null;
  text: (point: number) => string;
}) => (
  <>
    {marks.length > 0 ? <Ticks values={marks} {...ticks} /> : null}
    {range === null ? null : (
      <div
        aria-hidden="true"
        className="text-muted-foreground mt-2 flex justify-between font-mono text-[0.6875rem] tabular-nums"
      >
        <span>{text(range[0])}</span>
        <span>{text(range[1])}</span>
      </div>
    )}
  </>
);

/** Values as text, a share of the scale, and the selected span. */
const scaleOf = ({
  min,
  max,
  unit,
  format,
  values,
}: {
  min: number;
  max: number;
  unit: string;
  format: Intl.NumberFormatOptions;
  values: readonly number[];
}) => {
  const span = Math.max(max - min, 1e-9);
  const formatter = new Intl.NumberFormat("en-US", format);
  const [first = min] = values;
  const last = values.at(-1) ?? first;
  return {
    ratioOf: (point: number) => clamp01((point - min) / span),
    // One thumb fills from `min`; two fill between them.
    selected: (values.length > 1 ? [first, last] : [min, first]) satisfies [
      number,
      number,
    ],
    text: (point: number) => `${formatter.format(point)}${unit}`,
  };
};

/**
 * A range slider on Radix `Slider`, drawn in dither. The filled part of
 * the track is a Bayer ramp that gets denser towards the thumb and ends in
 * a solid edge, so the value reads at a glance; hover and drag thicken it.
 * The thumb is a lit, dithered cap. One thumb or two, with steps, tick
 * marks, a live readout and full keyboard and form support.
 */
export const DitherSlider = ({
  label,
  hideLabel = false,
  showValue = true,
  showRange = false,
  ticks = false,
  unit = "",
  format = { maximumFractionDigits: 1 },
  thumbLabels,
  color = "ink",
  size = "md",
  bloom = "off",
  matrix = "bayer4",
  cell = 2,
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  className,
  style,
  onPointerDown,
  onPointerUp,
  onLostPointerCapture,
  onKeyDown,
  onBlur,
  ...props
}: DitherSliderProps) => {
  const labelId = useId();
  const trackRef = useRef<HTMLSpanElement>(null);
  const width = useWidth(trackRef);
  const [inner, setInner] = useState<number[]>(() => defaultValue ?? [min]);
  const drag = useDragging({
    disabled,
    onBlur,
    onKeyDown,
    onLostPointerCapture,
    onPointerDown,
    onPointerUp,
  });
  const values = value ?? inner;
  const geometry = geometryOf(size, Math.max(1, Math.round(cell)));
  const { ratioOf, selected, text } = scaleOf({
    format,
    max,
    min,
    unit,
    values,
  });
  const marks = tickValues({ max, min, step, ticks });

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-45",
        className
      )}
      aria-disabled={disabled || undefined}
      // The fill and ticks are drawn left to right, so pin the direction
      // even inside an RTL page or a Radix DirectionProvider.
      dir="ltr"
      style={style}
    >
      <style href="dithercn-dither-slider" precedence="dithercn">
        {STYLES}
      </style>
      <Header
        id={labelId}
        label={label}
        hideLabel={hideLabel}
        readout={showValue ? values.map(text).join(" – ") : null}
      />
      <div>
        <Slider.Root
          data-slot="slider"
          dir="ltr"
          role="group"
          aria-labelledby={labelId}
          min={min}
          max={max}
          step={step}
          value={values}
          disabled={disabled}
          onValueChange={(next) => {
            if (value === undefined) {
              setInner(next);
            }
            onValueChange?.(next);
          }}
          {...drag}
          {...props}
          className={cn(
            "dcn-sld relative flex w-full touch-none items-center select-none",
            // A taller hit area than the thumb, for touch.
            "before:absolute before:inset-x-0 before:-inset-y-2.5",
            "cursor-pointer data-disabled:pointer-events-none"
          )}
          style={{ height: geometry.thumbHeight }}
        >
          <Slider.Track
            ref={trackRef}
            className="relative block grow"
            style={{ height: geometry.rows * geometry.cell }}
          >
            <TrackFill
              width={width}
              ratios={values.map(ratioOf)}
              geometry={geometry}
              color={color}
              bloom={bloom}
              matrix={matrix}
            />
          </Slider.Track>
          {values.map((point, index) => (
            <Slider.Thumb
              // Thumbs are positional: Radix keeps the values sorted.
              // oxlint-disable-next-line no-array-index-key
              key={index}
              aria-label={thumbLabel({
                count: values.length,
                index,
                label,
                thumbLabels,
              })}
              aria-valuetext={text(point)}
              className="dcn-sld-thumb relative block cursor-grab outline-hidden active:cursor-grabbing"
              style={{
                height: geometry.thumbHeight,
                width: geometry.thumbWidth,
              }}
            >
              <ThumbSurface geometry={geometry} color={color} bloom={bloom} />
            </Slider.Thumb>
          ))}
        </Slider.Root>
        <Footer
          marks={marks}
          selected={selected}
          ratioOf={ratioOf}
          text={text}
          range={showRange ? [min, max] : null}
          width={width}
          geometry={geometry}
          color={color}
        />
      </div>
    </div>
  );
};
