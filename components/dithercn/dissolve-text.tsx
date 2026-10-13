"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes } from "react";

import {
  ditherMask,
  getThresholdMap,
  MOTION,
  useInView,
  usePrefersReducedMotion,
} from "@/lib/dither";
import type { DitherMatrix } from "@/lib/dither";
import { cn } from "@/lib/utils";

/** The Bayer matrices. Blue noise tiles are too large to step through in CSS. */
export type DissolveMatrix = Exclude<DitherMatrix, "blue-noise">;

export type DissolveTextTag = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";

export type DissolveTextProps = Omit<
  HTMLAttributes<HTMLElement>,
  "children"
> & {
  /** The text. Each character (or word) stays real, selectable text. */
  children: string;
  /** The element to render. Default `"span"`. */
  as?: DissolveTextTag;
  /** Dissolve each character, each word, or the whole text at once. Default `"char"`. */
  by?: "char" | "word" | "line";
  /** Start on mount, or when scrolled into view. Default `"in-view"`. */
  trigger?: "mount" | "in-view";
  /** `false` dissolves the text out; `true` brings it back. Default `true`. */
  show?: boolean;
  /** Milliseconds for one character, word or line. Default 600. */
  duration?: number;
  /** Milliseconds between one unit and the next. Default 28 per character, 90 per word. */
  stagger?: number;
  /** Milliseconds before the first unit starts. Default 0. */
  delay?: number;
  /** Threshold matrix. Default `"bayer4"`. */
  matrix?: DissolveMatrix;
  /** Cell size in CSS pixels. Default `--dither-cell`. */
  cell?: number;
};

type DissolveState = "waiting" | "in" | "out";

// Levels stepped through per matrix: every level of bayer2 and bayer4,
// and every fourth of bayer8.
const STEPS: Record<DissolveMatrix, number> = {
  bayer2: 4,
  bayer4: 16,
  bayer8: 16,
};

const percent = (value: number) => `${(value * 100).toFixed(2)}%`;

const frame = (
  offset: number,
  level: number,
  steps: number,
  matrix: DissolveMatrix
) => {
  const image = level >= steps ? "none" : ditherMask(level / steps, { matrix });
  return `${percent(offset)}{-webkit-mask-image:${image};mask-image:${image}}`;
};

const sheets = new Map<DissolveMatrix, string>();

/**
 * Keyframes that step a mask through the matrix's levels with an ease-out
 * shape: level k lands at t where 1 - (1 - t)^2 = k / steps.
 */
const keyframesFor = (matrix: DissolveMatrix) => {
  const cached = sheets.get(matrix);
  if (cached !== undefined) {
    return cached;
  }
  const steps = STEPS[matrix];
  const offsets = Array.from(
    { length: steps + 1 },
    (_, k) => 1 - Math.sqrt(1 - k / steps)
  );
  const into = offsets.map((offset, k) => frame(offset, k, steps, matrix));
  const out = offsets.map((offset, k) =>
    frame(offset, steps - k, steps, matrix)
  );
  const css = `@keyframes dcn-dissolve-in-${matrix}{${into.join("")}}@keyframes dcn-dissolve-out-${matrix}{${out.join("")}}`;
  sheets.set(matrix, css);
  return css;
};

const BASE_CSS = `
.dcn-dissolve [data-dissolve-unit]{
  -webkit-mask-repeat:repeat;mask-repeat:repeat;
  -webkit-mask-size:var(--dissolve-tile);mask-size:var(--dissolve-tile);
  animation-duration:var(--dissolve-duration);
  animation-delay:calc(var(--i, 0) * var(--dissolve-stagger) + var(--dissolve-delay));
  animation-fill-mode:both;
  animation-timing-function:step-end;
}
.dcn-dissolve:is([data-state=in],[data-state=waiting]) [data-dissolve-unit]{animation-name:var(--dissolve-in)}
.dcn-dissolve[data-state=waiting] [data-dissolve-unit]{animation-play-state:paused}
.dcn-dissolve[data-state=out] [data-dissolve-unit]{animation-name:var(--dissolve-out)}
@media (prefers-reduced-motion:reduce){
  .dcn-dissolve [data-dissolve-unit]{animation:none}
  .dcn-dissolve[data-state=out]{opacity:0}
}`;

const NOSCRIPT_CSS =
  ".dcn-dissolve[data-state=waiting] [data-dissolve-unit]{animation:none}";

const unitStyle = (index: number) => {
  const style: CSSProperties & Record<"--i", number> = { "--i": index };
  return style;
};

interface Unit {
  text: string;
  index: number;
}

/** Words with their characters, numbered in reading order. */
const splitText = (text: string, by: "char" | "word") => {
  let index = 0;
  return text.split(/(\s+)/u).map((part) => {
    if (part.trim() === "") {
      return { space: part, units: [] satisfies Unit[] };
    }
    const pieces = by === "char" ? [...part] : [part];
    const units = pieces.map((piece) => {
      const unit = { index, text: piece };
      index += 1;
      return unit;
    });
    return { space: "", units };
  });
};

/**
 * Text that dissolves in through the levels of a Bayer matrix, one
 * character, word or line at a time, and optionally back out. The letters
 * stay real text; each one is masked by a dither that fills in over
 * `duration`. Under reduced motion it appears and disappears instantly.
 */
export const DissolveText = ({
  as: Tag = "span",
  children,
  by = "char",
  trigger = "in-view",
  show = true,
  duration = MOTION.slow,
  stagger,
  delay = 0,
  matrix = "bayer4",
  cell,
  className,
  style,
  ...rest
}: DissolveTextProps) => {
  const ref = useRef<HTMLElement>(null);
  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);
  const inView = useInView(ref, { rootMargin: "0px 0px -8% 0px" });
  const reducedMotion = usePrefersReducedMotion();
  const [seen, setSeen] = useState(trigger === "mount");

  useEffect(() => {
    if (inView) {
      setSeen(true);
    }
  }, [inView]);

  let state: DissolveState = "in";
  if (!show) {
    state = "out";
  } else if (!(seen || reducedMotion)) {
    state = "waiting";
  }

  const { size } = getThresholdMap(matrix);
  const cellSize = cell === undefined ? "var(--dither-cell)" : `${cell}px`;
  const rootStyle: CSSProperties & Record<`--${string}`, string> = {
    "--dissolve-delay": `${delay}ms`,
    "--dissolve-duration": `${duration}ms`,
    "--dissolve-in": `dcn-dissolve-in-${matrix}`,
    "--dissolve-out": `dcn-dissolve-out-${matrix}`,
    "--dissolve-stagger": `${stagger ?? (by === "word" ? 90 : 28)}ms`,
    "--dissolve-tile": `calc(${cellSize} * ${size})`,
    ...style,
  };

  return (
    <Tag
      {...rest}
      ref={setRef}
      data-state={state}
      aria-hidden={show ? rest["aria-hidden"] : true}
      className={cn("dcn-dissolve", className)}
      style={rootStyle}
    >
      <style href="dcn-dissolve" precedence="default">
        {BASE_CSS}
      </style>
      <style href={`dcn-dissolve-${matrix}`} precedence="default">
        {keyframesFor(matrix)}
      </style>
      <noscript>
        <style>{NOSCRIPT_CSS}</style>
      </noscript>
      {by === "line" ? (
        <span data-dissolve-unit="">{children}</span>
      ) : (
        splitText(children, by).map(({ space, units }, wordIndex) =>
          space === "" ? (
            <span key={wordIndex} className="whitespace-nowrap">
              {units.map((unit) => (
                <span
                  key={unit.index}
                  data-dissolve-unit=""
                  style={unitStyle(unit.index)}
                >
                  {unit.text}
                </span>
              ))}
            </span>
          ) : (
            space
          )
        )
      )}
    </Tag>
  );
};
