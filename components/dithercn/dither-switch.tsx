"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps, CSSProperties } from "react";

import { bloomStyle, cssColor, ditherMaskStyle, fillStyle } from "@/lib/dither";
import type { Bloom, DitherColor, FillVariant } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * Off, the track is a faint grey tint with a sparse grey texture inside a
 * hairline. On, it fills with ink as a wave: four copies of the colour,
 * each masked to a denser Bayer level, then the full lit surface (the
 * colour with a highlight dithered down from the top and a shade dithered
 * up from the bottom, as on Dither Button). Each layer is revealed from
 * the left by `clip-path`, a beat after the one below it, so the sparse
 * cells run ahead behind the thumb and the dense ones follow. Turning off
 * runs it backwards: the dense surface pulls back first and the sparse
 * levels drain after it. The clips and the thumb move on a staircase
 * curve with one step per cell, so nothing ever sits between cells.
 */

export type DitherSwitchSize = "sm" | "md" | "lg";

/** Target sizes in CSS pixels; each snaps to whole cells. */
const GEOMETRY = {
  lg: { height: 30, pad: 4, width: 54 },
  md: { height: 24, pad: 2, width: 42 },
  sm: { height: 20, pad: 2, width: 34 },
} as const satisfies Record<
  DitherSwitchSize,
  { height: number; pad: number; width: number }
>;

interface Geometry {
  width: number;
  height: number;
  pad: number;
  thumb: number;
  travel: number;
  radius: number;
  thumbRadius: number;
}

const snap = (px: number, cell: number) =>
  Math.max(cell, Math.round(px / cell) * cell);

const geometryOf = (size: DitherSwitchSize, cell: number): Geometry => {
  const target = GEOMETRY[size];
  const height = snap(target.height, cell);
  const pad = snap(target.pad, cell);
  const width = snap(target.width, cell);
  const thumb = height - pad * 2;
  const radius = Math.round(height * 0.32);
  return {
    height,
    pad,
    radius,
    thumb,
    thumbRadius: Math.max(2, radius - pad),
    travel: width - thumb - pad * 2,
    width,
  };
};

// The house ease-out, MOTION.ease: cubic-bezier(0.23, 1, 0.32, 1).
const EASE = [0.23, 1, 0.32, 1] as const;
const DURATION_MS = 300;
/** Delay between one wave layer and the next. */
const STAGGER_MS = 36;

const bezier = (p1: number, p2: number, s: number) =>
  3 * p1 * s * (1 - s) ** 2 + 3 * p2 * s * s * (1 - s) + s ** 3;

const stairCache = new Map<number, string>();

/**
 * A `linear()` easing that follows the ease-out curve but holds each value
 * until the next whole step, so a move of `steps` cells lands on a cell
 * boundary every frame. Each jump happens when the smooth curve passes the
 * middle of its step.
 */
const cellSteps = (steps: number): string => {
  const count = Math.max(1, Math.round(steps));
  const cached = stairCache.get(count);
  if (cached !== undefined) {
    return cached;
  }
  const SAMPLES = 720;
  const points = ["0 0%"];
  let step = 1;
  for (let index = 1; index <= SAMPLES && step <= count; index += 1) {
    const s = index / SAMPLES;
    const time = bezier(EASE[0], EASE[2], s);
    const progress = bezier(EASE[1], EASE[3], s);
    while (step <= count && progress >= (step - 0.5) / count) {
      const at = `${(time * 100).toFixed(2)}%`;
      points.push(
        `${((step - 1) / count).toFixed(4)} ${at}`,
        `${(step / count).toFixed(4)} ${at}`
      );
      step += 1;
    }
  }
  points.push("1 100%");
  const easing = `linear(${points.join(", ")})`;
  stairCache.set(count, easing);
  return easing;
};

/** Bayer levels the wave steps through before the full surface, sparse to dense. */
const WAVE = [3 / 16, 6 / 16, 9 / 16, 12 / 16] as const;
const LAST = WAVE.length;

const STYLES = [
  ".dcn-switch{--dcn-knob:oklch(0.995 0 0);--dcn-knob-edge:oklch(0 0 0/0.2)}",
  ".dark .dcn-switch{--dcn-knob:oklch(0.94 0.004 270);--dcn-knob-edge:oklch(0 0 0/0.55)}",
  // Wave layers: hidden behind a clip at the left edge until checked.
  `.dcn-switch-wave{clip-path:inset(0 100% 0 0);transition:clip-path ${DURATION_MS}ms steps(var(--dcn-steps),jump-end);transition-delay:calc((${LAST} - var(--dcn-i)) * ${STAGGER_MS}ms)}`,
  `.dcn-switch[data-state=checked] .dcn-switch-wave{clip-path:inset(0 0 0 0);transition-delay:calc(var(--dcn-i) * ${STAGGER_MS}ms)}`,
  `.dcn-switch-thumb{transform:translateX(0);transition:transform ${DURATION_MS}ms steps(var(--dcn-steps),jump-end)}`,
  ".dcn-switch-thumb[data-state=checked]{transform:translateX(var(--dcn-travel))}",
  // Hover, focus and press fade whole layers; the masks never move.
  ".dcn-switch-hover,.dcn-switch-press{opacity:0;transition:opacity 220ms cubic-bezier(0.23,1,0.32,1)}",
  "@media (hover:hover){.dcn-switch:enabled:hover .dcn-switch-hover{opacity:var(--dcn-on,1)}}",
  ".dcn-switch:focus-visible .dcn-switch-hover{opacity:var(--dcn-on,1)}",
  ".dcn-switch:enabled:active .dcn-switch-press{opacity:1;transition-duration:80ms}",
  "@media (prefers-reduced-motion:reduce){.dcn-switch-wave,.dcn-switch-thumb,.dcn-switch-hover,.dcn-switch-press{transition:none}}",
].join("");

/** Inline styles that also carry the custom properties above. */
type LayerStyle = CSSProperties & Record<`--${string}`, string | number>;

const cells = (rows: number, share: number) =>
  Math.max(2, Math.round(rows * share));

interface Paint {
  fill: FillVariant;
  cell: number;
  /** Height of the surface in cells. */
  rows: number;
}

/** The shade of the lit surface, textured by the fill variant. */
const shadeLayer = (
  { fill, cell, rows }: Paint,
  color: string
): CSSProperties => {
  switch (fill) {
    case "gradient": {
      return fillStyle("gradient", {
        cell,
        color,
        edge: "bottom",
        from: 1,
        length: cells(rows, 0.55),
        to: 0,
      });
    }
    case "dotted":
    case "hatched": {
      return { ...fillStyle(fill, { cell, color }), opacity: 0.55 };
    }
    case "solid": {
      return fillStyle("gradient", {
        cell,
        color,
        edge: "bottom",
        from: 1,
        length: 3,
        to: 0,
      });
    }
    default: {
      const exhaustive: never = fill;
      return exhaustive;
    }
  }
};

/** The off track's texture: grey, sparse, in the fill variant. */
const restTexture = ({ fill, cell, rows }: Paint): CSSProperties => {
  const color = "grey";
  if (fill === "dotted" || fill === "hatched") {
    return { ...fillStyle(fill, { cell, color }), opacity: 0.45 };
  }
  return {
    ...fillStyle("gradient", {
      cell,
      color,
      edge: "bottom",
      from: fill === "solid" ? 0.25 : 0.5,
      length: cells(rows, 0.7),
      to: 0,
    }),
    opacity: 0.7,
  };
};

const highlight = (
  { cell, rows }: Paint,
  color: string,
  share: number,
  from: number
) =>
  fillStyle("gradient", {
    cell,
    color,
    edge: "top",
    from,
    length: cells(rows, share),
    to: 0,
  });

const LAYER = "absolute inset-0 rounded-[inherit]";

interface TrackProps extends Paint {
  color: DitherColor;
  bloom: Bloom;
  /** Width of the track in cells: one clip step each. */
  steps: number;
}

/** The off track, then the wave of ink that covers it when checked. */
const Track = ({ color, bloom, steps, ...paint }: TrackProps) => {
  const base = cssColor(color);
  const light = `color-mix(in oklab, ${base}, white 42%)`;
  const dark = `color-mix(in oklab, ${base}, black 48%)`;
  const easing = cellSteps(steps);
  const wave = (index: number): LayerStyle => ({
    "--dcn-i": index,
    "--dcn-steps": steps,
    transitionTimingFunction: easing,
  });
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        <span
          className={LAYER}
          style={{
            backgroundColor:
              "color-mix(in oklab, var(--dither-color-grey) 16%, transparent)",
          }}
        />
        <span className={LAYER} style={restTexture(paint)} />
        <span
          className={cn(LAYER, "dcn-switch-hover")}
          style={fillStyle("gradient", {
            cell: paint.cell,
            color: "grey",
            edge: "bottom",
            from: 0.75,
            length: paint.rows,
            to: 0.0625,
          })}
        />
        <span
          className={LAYER}
          style={{
            boxShadow:
              "inset 0 0 0 1px color-mix(in oklab, var(--dither-color-grey) 38%, transparent)",
          }}
        />
      </span>
      {/* The glow sits outside the clipping box so it can spill past the track. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={bloomStyle(color, bloom)}
      >
        <span className="absolute inset-0 overflow-hidden rounded-[inherit]">
          {WAVE.map((level, index) => (
            <span
              key={level}
              className={cn(LAYER, "dcn-switch-wave")}
              style={{
                ...ditherMaskStyle(level, { cell: paint.cell }),
                backgroundColor: base,
                ...wave(index),
              }}
            />
          ))}
          <span className={cn(LAYER, "dcn-switch-wave")} style={wave(LAST)}>
            <span className={LAYER} style={{ backgroundColor: base }} />
            <span className={LAYER} style={shadeLayer(paint, dark)} />
            <span className={LAYER} style={highlight(paint, light, 0.25, 1)} />
            <span
              className={cn(LAYER, "dcn-switch-hover")}
              style={highlight(paint, light, 0.6, 1)}
            />
            {/* A darker hairline holds the edge; the top lip catches the light. */}
            <span
              className={LAYER}
              style={{
                boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${base}, black 30%), inset 0 1px 0 color-mix(in oklab, ${base}, white 55%)`,
              }}
            />
          </span>
        </span>
      </span>
    </>
  );
};

/** The knob: a light surface lit like a button, over a dithered drop shadow. */
const Knob = ({ cell, rows }: { cell: number; rows: number }) => {
  const paint: Paint = { cell, fill: "gradient", rows };
  const knob = "var(--dcn-knob)";
  const shade = "color-mix(in oklab, var(--dcn-knob), black 24%)";
  return (
    <>
      <span
        className={LAYER}
        style={{
          ...ditherMaskStyle(0.5, { cell }),
          backgroundColor: "oklch(0 0 0 / 0.45)",
          transform: `translateY(${cell}px)`,
        }}
      />
      <span className={LAYER} style={{ backgroundColor: knob }} />
      <span
        className={LAYER}
        style={fillStyle("gradient", {
          cell,
          color: shade,
          edge: "bottom",
          from: 1,
          length: cells(rows, 0.4),
          to: 0,
        })}
      />
      <span className={LAYER} style={highlight(paint, "white", 0.3, 1)} />
      <span
        className={cn(LAYER, "dcn-switch-press")}
        style={fillStyle("gradient", {
          cell,
          color: shade,
          edge: "top",
          from: 0.5,
          length: cells(rows, 0.5),
          to: 0,
        })}
      />
      <span
        className={LAYER}
        style={{ boxShadow: "inset 0 0 0 1px var(--dcn-knob-edge)" }}
      />
    </>
  );
};

interface OwnProps {
  /** Colour of the ink when on: a palette name or any CSS colour. Default `"ink"`. */
  color?: DitherColor;
  /** Texture of the shade when on and of the track when off: a Bayer ramp, a dot lattice, diagonals, or a thin rim. Default `"gradient"`. */
  fill?: FillVariant;
  /** Track of 34×20, 42×24 or 54×30 pixels. Default `"md"`. */
  size?: DitherSwitchSize;
  /** A soft glow in the ink's colour when on. Default `"off"`. */
  bloom?: Bloom;
  /** Size of one dither cell in CSS pixels. Default 2. */
  cell?: number;
}

export type DitherSwitchProps = OwnProps &
  Omit<ComponentProps<typeof SwitchPrimitive.Root>, "children" | "color">;

/**
 * A Radix switch whose track fills with dither when it turns on: the ink
 * steps in through the Bayer levels behind the thumb, sparse first and
 * dense after, and drains out the same way when it turns off. The thumb
 * is a lit, dithered knob. Every move lands on whole cells.
 */
export const DitherSwitch = ({
  color = "ink",
  fill = "gradient",
  size = "md",
  bloom = "off",
  cell = 2,
  className,
  style,
  ...props
}: DitherSwitchProps) => {
  const step = Math.max(1, Math.round(cell));
  const box = geometryOf(size, step);
  const root: CSSProperties = {
    borderRadius: box.radius,
    height: box.height,
    width: box.width,
    ...style,
  };
  const thumb: LayerStyle = {
    "--dcn-steps": box.travel / step,
    "--dcn-travel": `${box.travel}px`,
    borderRadius: box.thumbRadius,
    height: box.thumb,
    left: box.pad,
    top: box.pad,
    transitionTimingFunction: cellSteps(box.travel / step),
    width: box.thumb,
  };
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-fill={fill}
      {...props}
      className={cn(
        "dcn-switch group/switch relative isolate inline-flex shrink-0 cursor-pointer items-center",
        // A larger hit area than the track, without changing its layout.
        "after:absolute after:-inset-x-1 after:-inset-y-2 after:content-['']",
        "outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
        "disabled:cursor-not-allowed disabled:opacity-45",
        className
      )}
      style={root}
    >
      <style href="dithercn-dither-switch" precedence="dithercn">
        {STYLES}
      </style>
      <Track
        color={color}
        bloom={bloom}
        fill={fill}
        cell={step}
        rows={box.height / step}
        steps={box.width / step}
      />
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="dcn-switch-thumb pointer-events-none absolute block"
        style={thumb}
      >
        <Knob cell={step} rows={box.thumb / step} />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
};
