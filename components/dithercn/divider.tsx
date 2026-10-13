import { useId } from "react";
import type { ComponentProps, ReactNode } from "react";

import { DitherPattern, FillPattern } from "@/lib/dither";
import type { DitherColor, DitherMatrix, FillVariant } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * The rule is an SVG with no viewBox, so one user unit is one CSS pixel
 * and every pattern tiles from the same origin. It is cut into steps along
 * its length: a solid run in the middle and, at each end, a ramp of steps
 * whose dither level falls towards the tip. Neighbouring steps line up
 * cell for cell, so the fade has no seams. A dotted, hatched or solid
 * rule uses one texture and fades its steps by opacity instead.
 */

const STEPS = 10;

export type DividerOrientation = "horizontal" | "vertical";

export type DividerProps = Omit<ComponentProps<"div">, "children" | "color"> & {
  /** Default `"horizontal"`. */
  orientation?: DividerOrientation;
  /** Text in the middle of the rule, such as "or". Horizontal only. */
  label?: ReactNode;
  /** Thickness in cells. Default 2. */
  thickness?: number;
  /** Share of each half that fades out, 0 to 1. Default 0.6. */
  fade?: number;
  /** Densest dither level, at the middle of the rule. Default 0.6. */
  strength?: number;
  /** Rule colour: a palette name or any CSS colour. Default `"ink"`. */
  color?: DitherColor;
  /** Texture of the rule. `gradient` fades through dither levels; the others fade by opacity. Default `"gradient"`. */
  fill?: FillVariant;
  /** Threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Size of one dither cell in CSS pixels. Default 2. */
  cell?: number;
  /** Hide the rule from assistive technology. Default `true` without a label. */
  decorative?: boolean;
};

interface Step {
  /** Start along the rule, in percent. */
  start: number;
  /** Length along the rule, in percent. */
  length: number;
  /** Index into the level list. */
  level: number;
}

/**
 * Steps for one rule from 0% to 100%. `fadeStart` and `fadeEnd` say which
 * tips fade; the ramp eases out so the rule thins quickly near the tip.
 */
const stepsFor = ({
  fade,
  fadeStart,
  fadeEnd,
}: {
  fade: number;
  fadeStart: boolean;
  fadeEnd: boolean;
}): Step[] => {
  const ramps = Number(fadeStart) + Number(fadeEnd);
  const rampLength = ramps === 0 ? 0 : Math.min(fade * 50, 100 / ramps);
  const step = rampLength / STEPS;
  const ramp = (from: number, ascending: boolean) =>
    Array.from({ length: STEPS }, (_, index) => ({
      length: step,
      level: ascending ? index : STEPS - 1 - index,
      start: from + index * step,
    }));
  const solidStart = fadeStart ? rampLength : 0;
  const solidEnd = fadeEnd ? 100 - rampLength : 100;
  return [
    ...(fadeStart ? ramp(0, true) : []),
    { length: solidEnd - solidStart, level: STEPS, start: solidStart },
    ...(fadeEnd ? ramp(solidEnd, false) : []),
  ];
};

const Rule = ({
  vertical,
  steps,
  thickness,
  strength,
  color,
  fill,
  matrix,
  cell,
  className,
}: {
  vertical: boolean;
  steps: Step[];
  thickness: number;
  strength: number;
  color: DitherColor;
  fill: FillVariant;
  matrix: DitherMatrix;
  cell: number;
  className?: string;
}) => {
  const id = useId();
  const levels = Array.from({ length: STEPS + 1 }, (_, index) => {
    const t = (index + 1) / (STEPS + 1);
    return strength * t ** 1.6;
  });
  const breadth = Math.max(1, Math.round(thickness)) * cell;

  return (
    <svg
      aria-hidden="true"
      className={cn(vertical ? "h-full" : "w-full", "block shrink", className)}
      style={vertical ? { width: breadth } : { height: breadth }}
      shapeRendering="crispEdges"
    >
      <defs>
        {fill === "gradient" ? null : (
          <FillPattern
            id={`${id}-texture`}
            fill={fill}
            color={color}
            cell={cell}
          />
        )}
        {levels.map((level, index) => (
          <DitherPattern
            key={level}
            id={`${id}-${index}`}
            level={level}
            matrix={matrix}
            cell={cell}
            color={color}
          />
        ))}
      </defs>
      {steps.map(({ start, length, level }) => (
        <rect
          key={start}
          x={vertical ? 0 : `${start}%`}
          y={vertical ? `${start}%` : 0}
          width={vertical ? "100%" : `${length + 0.05}%`}
          height={vertical ? `${length + 0.05}%` : "100%"}
          fill={
            fill === "gradient" ? `url(#${id}-${level})` : `url(#${id}-texture)`
          }
          fillOpacity={
            fill === "gradient"
              ? undefined
              : strength * ((level + 1) / (STEPS + 1)) ** 1.6
          }
        />
      ))}
    </svg>
  );
};

/**
 * A dithered rule whose ends fade out through the dither levels. With a
 * `label`, the rule splits around it and each half fades away from the
 * text. Vertical rules fill the height of their container.
 */
export const Divider = ({
  orientation = "horizontal",
  label,
  thickness = 2,
  fade = 0.6,
  strength = 0.6,
  color = "ink",
  fill = "gradient",
  matrix = "bayer4",
  cell = 2,
  decorative,
  className,
  ...props
}: DividerProps) => {
  const vertical = orientation === "vertical";
  const amount = Math.min(1, Math.max(0, fade));
  const rule = {
    cell,
    color,
    fill,
    matrix,
    strength: Math.min(1, Math.max(0, strength)),
    thickness,
    vertical,
  };

  if (label !== undefined && !vertical) {
    return (
      <div
        data-slot="divider"
        className={cn("flex w-full items-center gap-3", className)}
        {...props}
      >
        <Rule
          {...rule}
          steps={stepsFor({
            fade: amount * 2,
            fadeEnd: false,
            fadeStart: true,
          })}
          className="min-w-0 flex-1"
        />
        <span className="text-muted-foreground shrink-0 text-xs leading-none font-medium tracking-wide">
          {label}
        </span>
        <Rule
          {...rule}
          steps={stepsFor({
            fade: amount * 2,
            fadeEnd: true,
            fadeStart: false,
          })}
          className="min-w-0 flex-1"
        />
      </div>
    );
  }

  const isDecorative = decorative ?? true;
  return (
    <div
      data-slot="divider"
      role={isDecorative ? "none" : "separator"}
      aria-orientation={isDecorative ? undefined : orientation}
      className={cn(
        "flex shrink-0",
        vertical ? "h-full self-stretch" : "w-full",
        className
      )}
      {...props}
    >
      <Rule
        {...rule}
        steps={stepsFor({ fade: amount, fadeEnd: true, fadeStart: true })}
      />
    </div>
  );
};
