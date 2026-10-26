"use client";

import { useId, useRef, useSyncExternalStore } from "react";
import type { ComponentProps, RefObject } from "react";

import {
  BloomGroup,
  cssColor,
  DitherPattern,
  FillPattern,
  MOTION,
  readDitherCell,
  subscribeToTheme,
} from "@/lib/dither";
import type {
  Bloom,
  DitherColor,
  DitherMatrix,
  FillVariant,
} from "@/lib/dither";
import { cn } from "@/lib/utils";

/**
 * `half`: a 180° arc, open at the bottom. `dial`: 270°, like a speedometer.
 * `ring`: a full circle starting at the top.
 */
export type GaugeVariant = "half" | "dial" | "ring";

export type GaugeProps = Omit<ComponentProps<"div">, "children"> & {
  /** The reading, between `min` and `max`. */
  value: number;
  /** What is measured. Shown under the value and used as the accessible name. */
  label: string;
  /** Default 0. */
  min?: number;
  /** Default 100. */
  max?: number;
  /** Arc shape. Default `"half"`. */
  variant?: GaugeVariant;
  /** Width of the gauge in CSS pixels. Default 220. */
  size?: number;
  /** Number of blocks the arc is split into. Default 28 (half), 36 (dial), 48 (ring). */
  segments?: number;
  /** Shown after the value, such as `"%"` or `" ms"`. */
  unit?: string;
  /** `Intl.NumberFormat` options for the value. Default: up to one decimal. */
  format?: Intl.NumberFormatOptions;
  /** Show `min` and `max` under the ends of the arc. Default true, except for `ring`. */
  showRange?: boolean;
  /** Colour of the value arc: a palette name or any CSS colour. Default `ink`. */
  color?: DitherColor;
  /** Colour of the empty track, drawn faint. Default: `color`. */
  trackColor?: DitherColor;
  /**
   * Texture of the filled blocks. `gradient`: the block at the value is
   * solid and each one behind it a step lighter. `dotted`, `hatched` and
   * `solid` fill evenly, with the block at the value solid. Default `gradient`.
   */
  fill?: FillVariant;
  /** Soft glow in `color` behind the filled blocks: `off`, `low` or `high`. Default `off`. */
  bloom?: Bloom;
  /** Fill the blocks in one by one on mount. Default true; off under reduced motion. */
  animate?: boolean;
  /** Gradient only: threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Cell size in CSS pixels. Default `--dither-cell`. */
  cell?: number;
};

interface Sweep {
  start: number;
  span: number;
  segments: number;
}

const SWEEPS = {
  dial: { segments: 36, span: 270, start: -135 },
  half: { segments: 28, span: 180, start: -90 },
  ring: { segments: 48, span: 360, start: 0 },
} as const satisfies Record<GaugeVariant, Sweep>;

/** The block at the value is solid; each one behind it is a step lighter. */
const HEAD_FALLOFF = 1 / 16;
const TAIL_LEVEL = 9 / 16;
const GAP_PX = 2;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** `cell`, or `--dither-cell` as it applies to the element. 3 on the server. */
const useCellSize = (ref: RefObject<Element | null>, cell?: number) =>
  useSyncExternalStore(
    subscribeToTheme,
    () => cell ?? readDitherCell(ref.current),
    () => cell ?? 3
  );

interface Ring {
  cx: number;
  cy: number;
  inner: number;
  outer: number;
}

/**
 * The arc as whole dither cells. Every cell on the gauge's grid is tested at
 * its centre: its distance from the middle picks the ring, its angle picks
 * the block, and its distance from the nearest block boundary leaves the
 * gaps. So the curved edges and the gaps step along the grid, like the
 * globe's limb, instead of cutting cells in half.
 */
interface ArcCells {
  /** Each block's cells as an SVG path, in CSS pixels. */
  track: readonly string[];
  /** Each lit block's cells; the head block only up to the value. */
  lit: readonly string[];
}

const runPath = (runs: readonly [number, number, number][], cell: number) =>
  runs
    .map(
      ([col, row, length]) =>
        `M${col * cell} ${row * cell}h${length * cell}v${cell}h${-length * cell}z`
    )
    .join("");

/** Add a cell to a list of row runs, extending the last run when adjacent. */
const addCell = (
  target: [number, number, number][],
  col: number,
  row: number
) => {
  const last = target.at(-1);
  if (last && last[1] === row && last[0] + last[2] === col) {
    last[2] += 1;
  } else {
    target.push([col, row, 1]);
  }
};

const rasterArc = ({
  ring,
  sweep,
  count,
  active,
  filled,
  cell,
  width,
  height,
}: {
  ring: Ring;
  sweep: Sweep;
  count: number;
  active: number;
  filled: number;
  cell: number;
  width: number;
  height: number;
}): ArcCells => {
  const step = sweep.span / count;
  const halfGap = Math.max(GAP_PX, cell) * 0.6;
  const head = active - 1;
  // The head block reaches the value, and steps out by a cell.
  const headEnd = (head + clamp01(filled - head)) * step;
  const track: [number, number, number][][] = Array.from(
    { length: count },
    () => []
  );
  const lit: [number, number, number][][] = Array.from(
    { length: count },
    () => []
  );
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  for (let row = 0; row < rows; row += 1) {
    const dy = (row + 0.5) * cell - ring.cy;
    for (let col = 0; col < cols; col += 1) {
      const dx = (col + 0.5) * cell - ring.cx;
      const r = Math.hypot(dx, dy);
      if (r < ring.inner || r > ring.outer + cell) {
        continue;
      }
      // Degrees clockwise from 12 o'clock, measured from the sweep's start.
      const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI;
      const along = (((degrees - sweep.start) % 360) + 360) % 360;
      if (along > sweep.span) {
        continue;
      }
      const index = Math.min(count - 1, Math.floor(along / step));
      const offset = Math.min(along - index * step, (index + 1) * step - along);
      if (r * Math.sin((offset * Math.PI) / 180) < halfGap) {
        continue;
      }
      const inRing = r <= ring.outer;
      if (inRing) {
        addCell(track[index] ?? [], col, row);
      }
      if (index < head ? inRing : index === head && along <= headEnd) {
        addCell(lit[index] ?? [], col, row);
      }
    }
  }
  return {
    lit: lit.map((runs) => runPath(runs, cell)),
    track: track.map((runs) => runPath(runs, cell)),
  };
};

/** The arc: faint track blocks, bloom, then the filled blocks. */
const Arc = ({
  cells,
  active,
  size,
  height,
  fill,
  color,
  trackColor,
  bloom,
  animate,
  matrix,
  cellSize,
  prefix,
}: {
  cells: ArcCells;
  active: number;
  size: number;
  height: number;
  fill: FillVariant;
  color: DitherColor;
  trackColor: DitherColor;
  bloom: Bloom;
  animate: boolean;
  matrix: DitherMatrix;
  cellSize: number;
  prefix: string;
}) => {
  const levelFor = (index: number) =>
    Math.max(TAIL_LEVEL, 1 - (active - 1 - index) * HEAD_FALLOFF);
  const lit = cells.lit
    .slice(0, active)
    .map((d, index) => ({ d, index }))
    .filter(({ d }) => d !== "");
  const levels = [...new Set(lit.map(({ index }) => levelFor(index)))];
  const levelId = (level: number) => `${prefix}-${Math.round(level * 16)}`;
  const fillOf = (index: number) => {
    if (index === active - 1 || fill === "solid") {
      return cssColor(color);
    }
    return fill === "gradient"
      ? `url(#${levelId(levelFor(index))})`
      : `url(#${prefix}-texture)`;
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={height}
      viewBox={`0 0 ${size} ${height}`}
      className="block overflow-visible"
    >
      <defs>
        {fill === "dotted" || fill === "hatched" ? (
          <FillPattern
            id={`${prefix}-texture`}
            fill={fill}
            color={color}
            cell={cellSize}
          />
        ) : null}
        {fill === "gradient"
          ? levels.map((level) => (
              <DitherPattern
                key={level}
                id={levelId(level)}
                level={level}
                matrix={matrix}
                cell={cellSize}
                color={color}
              />
            ))
          : null}
      </defs>
      <g
        style={{
          fill: `color-mix(in oklab, ${cssColor(trackColor)} 14%, transparent)`,
        }}
      >
        <path d={cells.track.join("")} shapeRendering="crispEdges" />
      </g>
      <BloomGroup bloom={bloom} fill={cssColor(color)}>
        {lit.map(({ d, index }) => (
          <path key={index} d={d} />
        ))}
      </BloomGroup>
      {lit.map(({ d, index }) => (
        <path
          key={index}
          d={d}
          fill={fillOf(index)}
          shapeRendering="crispEdges"
          className={cn(
            animate &&
              "transition-opacity motion-reduce:transition-none starting:opacity-0"
          )}
          style={{
            transitionDelay: `${index * 14}ms`,
            transitionDuration: `${MOTION.base}ms`,
            transitionTimingFunction: MOTION.ease,
          }}
        />
      ))}
    </svg>
  );
};

/** The reading and label, in the middle of the arc. */
const Reading = ({
  variant,
  size,
  readout,
  label,
}: {
  variant: GaugeVariant;
  size: number;
  readout: string;
  label: string;
}) => (
  <div
    aria-hidden="true"
    className={cn(
      "pointer-events-none absolute inset-x-0 flex flex-col items-center",
      variant === "half" ? "bottom-0" : "-translate-y-1/2"
    )}
    style={variant === "half" ? undefined : { top: size / 2 }}
  >
    <span
      className="text-foreground leading-none font-semibold tracking-tight tabular-nums"
      style={{ fontSize: Math.round(size * 0.15) }}
    >
      {readout}
    </span>
    <span className="text-muted-foreground mt-1.5 max-w-[80%] truncate text-xs">
      {label}
    </span>
  </div>
);

/** Block geometry for a gauge `size` px wide. */
const layoutGauge = ({
  variant,
  size,
  segments,
  cellSize,
  ratio,
}: {
  variant: GaugeVariant;
  size: number;
  segments: number | undefined;
  cellSize: number;
  ratio: number;
}) => {
  const sweep = SWEEPS[variant];
  const count = Math.max(2, Math.round(segments ?? sweep.segments));
  // Thickness and radii snap to whole cells so the blocks stay crisp.
  const thickness =
    Math.max(2, Math.round((size * 0.12) / cellSize)) * cellSize;
  // Leave a cell outside the arc for the head block to step into.
  const outer = size / 2 - 1 - cellSize;
  const ring: Ring = {
    cx: size / 2,
    cy: size / 2,
    inner: outer - thickness,
    outer,
  };
  // The dial's ends sit 45° below the centre, so it needs less than a full circle.
  const heights = {
    dial: size / 2 + (outer + cellSize) * Math.SQRT1_2,
    half: size / 2,
    ring: size,
  } as const satisfies Record<GaugeVariant, number>;
  // Distance between the centres of the two ends, for the min/max labels.
  const middle = outer - thickness / 2;
  const rangeWidth =
    2 * middle * Math.sin((sweep.span * Math.PI) / 360) + thickness;
  const filled = ratio * count;
  const active = Math.ceil(filled - 1e-6);
  const height = heights[variant];
  return {
    active,
    cells: rasterArc({
      active,
      cell: cellSize,
      count,
      filled,
      height: height + cellSize,
      ring,
      sweep,
      width: size,
    }),
    height,
    rangeWidth,
    thickness,
  };
};

/**
 * A radial gauge built from dithered blocks. Blocks up to the value fill
 * in over a faint track, and the block at the value is solid and steps
 * out by a cell like a needle. The reading sits in the middle. Exposed to
 * assistive technology as a meter.
 */
export const Gauge = ({
  value,
  label,
  min = 0,
  max = 100,
  variant = "half",
  size = 220,
  segments,
  unit = "",
  format = { maximumFractionDigits: 1 },
  showRange = variant !== "ring",
  color = "ink",
  trackColor,
  fill = "gradient",
  bloom = "off",
  animate = true,
  matrix = "bayer4",
  cell,
  className,
  style,
  ...props
}: GaugeProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const cellSize = useCellSize(ref, cell);
  const prefix = `gauge${useId().replaceAll(/[^a-zA-Z0-9]/g, "")}`;
  const clamped = Math.min(max, Math.max(min, value));
  const ratio = clamp01((clamped - min) / Math.max(max - min, 1e-9));
  const formatter = new Intl.NumberFormat("en-US", format);
  const readout = `${formatter.format(clamped)}${unit}`;
  const layout = layoutGauge({ cellSize, ratio, segments, size, variant });

  return (
    <div
      ref={ref}
      role="meter"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={clamped}
      aria-valuetext={readout}
      className={cn("relative inline-flex flex-col items-center", className)}
      style={{ width: size, ...style }}
      {...props}
    >
      <div className="relative" style={{ height: layout.height, width: size }}>
        <Arc
          cells={layout.cells}
          active={layout.active}
          size={size}
          height={layout.height}
          fill={fill}
          color={color}
          trackColor={trackColor ?? color}
          bloom={bloom}
          animate={animate}
          matrix={matrix}
          cellSize={cellSize}
          prefix={prefix}
        />
        <Reading
          variant={variant}
          size={size}
          readout={readout}
          label={label}
        />
      </div>
      {showRange ? (
        <div
          aria-hidden="true"
          className="text-muted-foreground mt-1.5 flex justify-between font-mono text-[0.6875rem] tabular-nums"
          style={{ width: layout.rangeWidth }}
        >
          <span className="text-center" style={{ width: layout.thickness }}>
            {formatter.format(min)}
          </span>
          <span className="text-center" style={{ width: layout.thickness }}>
            {formatter.format(max)}
          </span>
        </div>
      ) : null}
    </div>
  );
};
