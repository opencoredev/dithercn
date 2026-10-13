"use client";

import { useId, useRef, useSyncExternalStore } from "react";
import type { ComponentProps, RefObject } from "react";

import {
  DitherPattern,
  MOTION,
  readDitherCell,
  subscribeToTheme,
} from "@/lib/dither";
import type { DitherColor, DitherMatrix } from "@/lib/dither";
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
  /** Ink colour of the value arc. Default `--dither-ink`. */
  color?: DitherColor;
  /** Colour of the empty track. Default: the ink colour. */
  trackColor?: DitherColor;
  /** Threshold matrix. Default `"bayer4"`. */
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

const TRACK_LEVEL = 3 / 16;
/** The block at the value is solid; each one behind it is a step lighter. */
const HEAD_FALLOFF = 1 / 16;
const TAIL_LEVEL = 9 / 16;
const GAP_PX = 2;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const round = (value: number) => Math.round(value * 100) / 100;

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

/** A point at `degrees` clockwise from 12 o'clock. */
const polar = (cx: number, cy: number, radius: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return `${round(cx + radius * Math.sin(radians))} ${round(cy - radius * Math.cos(radians))}`;
};

/** An annular sector from `from` to `to` degrees. */
const sector = ({ cx, cy, inner, outer }: Ring, from: number, to: number) => {
  const large = to - from > 180 ? 1 : 0;
  return [
    `M${polar(cx, cy, outer, from)}`,
    `A${outer} ${outer} 0 ${large} 1 ${polar(cx, cy, outer, to)}`,
    `L${polar(cx, cy, inner, to)}`,
    `A${inner} ${inner} 0 ${large} 0 ${polar(cx, cy, inner, from)}`,
    "Z",
  ].join("");
};

/**
 * A radial gauge built from dithered blocks. Blocks up to the value fill
 * in, densest at the value and lighter behind it, over a faint track. The
 * reading sits in the middle. Exposed to assistive technology as a meter.
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
  color = "--dither-ink",
  trackColor,
  matrix = "bayer4",
  cell,
  className,
  style,
  ...props
}: GaugeProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const cellSize = useCellSize(ref, cell);
  const prefix = `gauge${useId().replaceAll(/[^a-zA-Z0-9]/g, "")}`;
  const sweep = SWEEPS[variant];
  const count = Math.max(2, Math.round(segments ?? sweep.segments));

  const clamped = Math.min(max, Math.max(min, value));
  const ratio = clamp01((clamped - min) / Math.max(max - min, 1e-9));
  const formatter = new Intl.NumberFormat("en-US", format);
  const readout = `${formatter.format(clamped)}${unit}`;

  // Thickness and radii snap to whole cells so the blocks stay crisp.
  const thickness =
    Math.max(2, Math.round((size * 0.12) / cellSize)) * cellSize;
  const outer = size / 2 - 1;
  const ring: Ring = {
    cx: size / 2,
    cy: size / 2,
    inner: outer - thickness,
    outer,
  };
  // The dial's ends sit 45° below the centre, so it needs less than a full circle.
  const heights = {
    dial: size / 2 + outer * Math.SQRT1_2,
    half: size / 2,
    ring: size,
  } as const satisfies Record<GaugeVariant, number>;
  const height = heights[variant];

  // Distance between the centres of the two ends, for the min/max labels.
  const middle = outer - thickness / 2;
  const rangeWidth =
    2 * middle * Math.sin((sweep.span * Math.PI) / 360) + thickness;

  const step = sweep.span / count;
  const gap = (GAP_PX / middle) * (180 / Math.PI);
  const filled = ratio * count;
  const active = Math.ceil(filled - 1e-6);

  const blocks = Array.from({ length: count }, (_, index) => {
    const from = sweep.start + index * step + gap / 2;
    const to = sweep.start + (index + 1) * step - gap / 2;
    return { from, index, to };
  });

  const levelFor = (index: number) =>
    Math.max(TAIL_LEVEL, 1 - (active - 1 - index) * HEAD_FALLOFF);
  const levels = [
    ...new Set(blocks.slice(0, active).map(({ index }) => levelFor(index))),
  ];
  const levelId = (level: number) => `${prefix}-${Math.round(level * 16)}`;

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
      <div className="relative" style={{ height, width: size }}>
        <svg
          aria-hidden
          width={size}
          height={height}
          viewBox={`0 0 ${size} ${height}`}
          className="block overflow-visible"
        >
          <defs>
            <DitherPattern
              id={`${prefix}-track`}
              level={TRACK_LEVEL}
              matrix={matrix}
              cell={cellSize}
              color={trackColor ?? color}
            />
            {levels.map((level) => (
              <DitherPattern
                key={level}
                id={levelId(level)}
                level={level}
                matrix={matrix}
                cell={cellSize}
                color={color}
              />
            ))}
          </defs>
          {blocks.map(({ from, index, to }) => (
            <path
              key={index}
              d={sector(ring, from, to)}
              fill={`url(#${prefix}-track)`}
            />
          ))}
          {blocks.slice(0, active).map(({ from, index, to }) => {
            const partial = index === active - 1 ? filled - index : 1;
            const end = from + (to - from) * clamp01(partial);
            return (
              <path
                key={index}
                d={sector(ring, from, Math.max(end, from + 0.5))}
                fill={`url(#${levelId(levelFor(index))})`}
                className="transition-opacity motion-reduce:transition-none starting:opacity-0"
                style={{
                  transitionDelay: `${index * 14}ms`,
                  transitionDuration: `${MOTION.base}ms`,
                  transitionTimingFunction: MOTION.ease,
                }}
              />
            );
          })}
        </svg>
        <div
          aria-hidden
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
      </div>
      {showRange ? (
        <div
          aria-hidden
          className="text-muted-foreground mt-1.5 flex justify-between font-mono text-[0.6875rem] tabular-nums"
          style={{ width: rangeWidth }}
        >
          <span className="text-center" style={{ width: thickness }}>
            {formatter.format(min)}
          </span>
          <span className="text-center" style={{ width: thickness }}>
            {formatter.format(max)}
          </span>
        </div>
      ) : null}
    </div>
  );
};
