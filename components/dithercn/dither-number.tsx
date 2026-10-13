"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes } from "react";

import {
  ditherMask,
  getThresholdMap,
  MOTION,
  thresholdAt,
  useInView,
  usePrefersReducedMotion,
} from "@/lib/dither";
import type { DitherMatrix } from "@/lib/dither";
import { cn } from "@/lib/utils";

/** The Bayer matrices. */
export type DitherNumberMatrix = Exclude<DitherMatrix, "blue-noise">;

export type DitherNumberProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  /** The number to show. Change it and the digits move to the new value. */
  value: number;
  /** Where the first run starts. Default 0. */
  from?: number;
  /** Passed to `Intl.NumberFormat`: currency, percent, compact notation, decimals. */
  format?: Intl.NumberFormatOptions;
  /** Passed to `Intl.NumberFormat`. Default: the visitor's locale. */
  locales?: Intl.LocalesArgument;
  /**
   * `"roll"`: digits spin into place through a dithered edge.
   * `"dissolve"`: each changed digit dissolves out and the new one in.
   * Default `"roll"`.
   */
  effect?: "roll" | "dissolve";
  /** Start the first run on mount, or when scrolled into view. Default `"in-view"`. */
  trigger?: "mount" | "in-view";
  /** Milliseconds per change. Default 1400 for roll, 600 for dissolve. */
  duration?: number;
  /** Threshold matrix for the dithered edges. Default `"bayer4"`. */
  matrix?: DitherNumberMatrix;
  /** Cell size in CSS pixels. Default `--dither-cell`, read at mount. */
  cell?: number;
};

type Glyph =
  | { kind: "digit"; key: string; digit: number | null; place: number }
  | { kind: "static"; key: string; char: string };

const DIGIT = /^[0-9]$/u;
const DIGIT_RUNS = /([0-9]+)/u;

/**
 * Lay out `target` as slots, then fill the digit slots with the digits of
 * `shown`, aligned from the right. Missing digits are `fill`.
 */
const layout = (
  formatter: Intl.NumberFormat,
  target: number,
  shown: number,
  fill: number | null
): Glyph[] => {
  const chars = [...formatter.format(target)];
  const shownDigits = [...formatter.format(shown)].filter((char) =>
    DIGIT.test(char)
  );
  const digitCount = chars.filter((char) => DIGIT.test(char)).length;
  let place = digitCount;
  return chars.map((char, index): Glyph => {
    if (!DIGIT.test(char)) {
      return { char, key: `s${chars.length - index}`, kind: "static" };
    }
    place -= 1;
    const fromShown = shownDigits.at(-1 - place);
    return {
      digit: fromShown === undefined ? fill : Number(fromShown),
      key: `d${place}`,
      kind: "digit",
      place,
    };
  });
};

// Separators, signs and symbols keep their natural width; only digits
// are tabular.
const STATIC_CLASS = "whitespace-pre [font-variant-numeric:normal]";

// ---------------------------------------------------------------- roll

const COPIES = 3;
const ROWS = 10 * COPIES;
const STRIP = Array.from({ length: ROWS }, (_, index) => index % 10);

const translate = (index: number) => `translateY(${(-index * 100) / ROWS}%)`;

/** The strip's current row, read from its computed transform mid-flight. */
const currentRow = (strip: HTMLElement) => {
  const { transform } = getComputedStyle(strip);
  const rowHeight = strip.offsetHeight / ROWS;
  if (transform === "none" || rowHeight === 0) {
    return 0;
  }
  return -new DOMMatrixReadOnly(transform).m42 / rowHeight;
};

const modulo = (value: number, base: number) => ((value % base) + base) % base;

/** 1 counting up, -1 counting down, 0 to jump without motion. */
type Direction = 1 | -1 | 0;

interface Shown {
  direction: Direction;
  value: number;
  /** How far the value moved in the last change. */
  delta: number;
}

interface SlotProps {
  digit: number | null;
  direction: Direction;
  /** Spin a full extra turn: the value moved by ten or more at this place. */
  spin: boolean;
  duration: number;
  delay: number;
  matrix: DitherNumberMatrix;
}

const RollSlot = ({ digit, direction, spin, duration }: SlotProps) => {
  const stripRef = useRef<HTMLSpanElement>(null);
  const value = digit ?? 0;
  // The first row is rendered once; after that the effect owns the
  // transform, so React never resets it mid-roll.
  const [initialRow] = useState(value + 10);

  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip) {
      return;
    }
    if (direction === 0) {
      strip.style.transition = "none";
      strip.style.transform = translate(value + 10);
      return;
    }
    const row = currentRow(strip);
    // Snap float drift (9.9996) to the row it really shows.
    const at = modulo(
      Math.abs(row - Math.round(row)) < 0.01 ? Math.round(row) : row,
      10
    );
    const extra = spin ? 10 : 0;
    let start = at;
    let end = value + (value > at ? 0 : 10) + extra;
    if (direction === -1) {
      start = at + 20;
      end = value + 20 - (value < at ? 0 : 10) - extra;
    }
    if (Math.abs(end - start) < 0.01) {
      return;
    }
    strip.style.transition = "none";
    strip.style.transform = translate(start);
    // Commit the start row before transitioning from it.
    strip.getBoundingClientRect();
    strip.style.transition = `transform ${duration}ms ${MOTION.ease}`;
    strip.style.transform = translate(end);
    const settle = () => {
      strip.style.transition = "none";
      strip.style.transform = translate(value + 10);
    };
    strip.addEventListener("transitionend", settle, { once: true });
    return () => strip.removeEventListener("transitionend", settle);
  }, [direction, duration, spin, value]);

  return (
    <>
      <span className="invisible">0</span>
      <span
        ref={stripRef}
        className="absolute inset-x-0 top-0 flex flex-col items-center will-change-transform"
        style={{ transform: translate(initialRow) }}
      >
        {STRIP.map((row, index) => (
          <span key={index} className="py-(--number-pad)">
            {row}
          </span>
        ))}
      </span>
    </>
  );
};

// ------------------------------------------------------------ dissolve

const DISSOLVE_STEPS = 16;
const dissolveSheets = new Map<DitherNumberMatrix, string>();

const dissolveKeyframes = (matrix: DitherNumberMatrix) => {
  const cached = dissolveSheets.get(matrix);
  if (cached !== undefined) {
    return cached;
  }
  const steps = matrix === "bayer2" ? 4 : DISSOLVE_STEPS;
  const frame = (k: number, level: number) => {
    const offset = (1 - Math.sqrt(1 - k / steps)) * 100;
    const image =
      level >= steps ? "none" : ditherMask(level / steps, { matrix });
    return `${offset.toFixed(2)}%{-webkit-mask-image:${image};mask-image:${image}}`;
  };
  const levels = Array.from({ length: steps + 1 }, (_, k) => k);
  const css = `@keyframes dcn-number-in-${matrix}{${levels.map((k) => frame(k, k)).join("")}}@keyframes dcn-number-out-${matrix}{${levels.map((k) => frame(k, steps - k)).join("")}}`;
  dissolveSheets.set(matrix, css);
  return css;
};

interface Layer {
  id: number;
  digit: number | null;
  leaving: boolean;
}

const DissolveSlot = ({
  digit,
  direction,
  duration,
  delay,
  matrix,
}: SlotProps) => {
  const [layers, setLayers] = useState<Layer[]>([
    { digit, id: 0, leaving: false },
  ]);
  const [current, setCurrent] = useState(digit);

  // Adjust state during render when the digit changes (no effect needed).
  if (current !== digit) {
    setCurrent(digit);
    const id = (layers.at(-1)?.id ?? 0) + 1;
    setLayers(
      direction === 0
        ? [{ digit, id, leaving: false }]
        : [
            ...layers
              .filter((layer) => !layer.leaving)
              .map((layer) => ({ ...layer, leaving: true })),
            { digit, id, leaving: false },
          ]
    );
  }

  const tile = `calc(var(--number-cell) * ${getThresholdMap(matrix).size})`;

  return (
    <>
      <span className="invisible">0</span>
      {layers.map((layer) => (
        <span
          key={layer.id}
          onAnimationEnd={() => {
            if (layer.leaving) {
              setLayers((list) => list.filter(({ id }) => id !== layer.id));
            }
          }}
          className="absolute inset-x-0 top-[var(--number-pad)] text-center"
          style={
            layer.id === 0 || direction === 0
              ? undefined
              : {
                  WebkitMaskRepeat: "repeat",
                  WebkitMaskSize: tile,
                  animation: `${layer.leaving ? "dcn-number-out" : "dcn-number-in"}-${matrix} ${duration}ms step-end ${layer.leaving ? 0 : delay}ms both`,
                  maskRepeat: "repeat",
                  maskSize: tile,
                }
          }
        >
          {layer.digit}
        </span>
      ))}
    </>
  );
};

// --------------------------------------------------------- edge mask

/**
 * A mask for the roll window: solid across the line, dithered out across
 * the padding above and below it. Built per measured size so the cells
 * stay square.
 */
const edgeMask = (
  height: number,
  pad: number,
  cell: number,
  matrix: DitherNumberMatrix
): CSSProperties => {
  const { size } = getThresholdMap(matrix);
  const rows = Math.max(1, Math.round(height / cell));
  const fade = Math.max(1, Math.round(pad / cell));
  let path = "";
  for (let y = 0; y < rows; y += 1) {
    const edge = Math.min(y, rows - 1 - y);
    const level = edge >= fade ? 1 : (edge + 0.5) / fade;
    for (let x = 0; x < size; x += 1) {
      if (level > thresholdAt(matrix, x, y)) {
        path += `M${x} ${y}h1v1h-1z`;
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${rows}" width="${size * cell}" height="${rows * cell}" shape-rendering="crispEdges"><path d="${path}"/></svg>`;
  const image = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  return {
    WebkitMaskImage: image,
    WebkitMaskPosition: "0 50%",
    WebkitMaskRepeat: "repeat-x",
    maskImage: image,
    maskPosition: "0 50%",
    maskRepeat: "repeat-x",
  };
};

// --------------------------------------------------------------- root

/**
 * An animated number for dashboards and landing stats. Digits are
 * tabular, formatting comes from `Intl.NumberFormat`, and each digit
 * rolls or dissolves into place. The formatted value is real text laid
 * over the animation, so it is selectable and read by screen readers.
 */
export const DitherNumber = ({
  value,
  from = 0,
  format,
  locales,
  effect = "roll",
  trigger = "in-view",
  duration,
  matrix = "bayer4",
  cell,
  className,
  style,
  ...rest
}: DitherNumberProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const windowRef = useRef<HTMLSpanElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const inView = useInView(ref, { rootMargin: "0px 0px -8% 0px" });
  const formatter = new Intl.NumberFormat(locales, format);

  // What the digits show, and how they got there. The server renders the
  // final value; on the client the digits wait at `from` until triggered.
  const [shown, setShown] = useState<Shown>({
    delta: 0,
    direction: 0,
    value,
  });
  const [armed, setArmed] = useState(false);
  const [started, setStarted] = useState(false);
  const [mask, setMask] = useState<CSSProperties | null>(null);
  const [cellSize, setCellSize] = useState(cell ?? 3);

  // Only the first mount waits at `from`; reduced motion is handled below.
  const fromRef = useRef(from);
  useLayoutEffect(() => {
    setShown({ delta: 0, direction: 0, value: fromRef.current });
    setArmed(true);
  }, []);

  useEffect(() => {
    if (!armed || started) {
      return;
    }
    if (trigger === "mount" || inView) {
      setStarted(true);
    }
  }, [armed, inView, started, trigger]);

  useEffect(() => {
    if (reducedMotion) {
      setShown({ delta: 0, direction: 0, value });
      return;
    }
    if (!(armed && started)) {
      return;
    }
    setShown((previous) => {
      if (previous.value === value) {
        return previous;
      }
      return {
        delta: Math.abs(value - previous.value),
        direction: value > previous.value ? 1 : -1,
        value,
      };
    });
  }, [armed, reducedMotion, started, value]);

  // Measure the roll window so the dithered edges keep square cells.
  useEffect(() => {
    const el = windowRef.current;
    const root = ref.current;
    if (!el || !root) {
      return;
    }
    const measure = () => {
      const size =
        cell ??
        (Number.parseFloat(
          getComputedStyle(root).getPropertyValue("--dither-cell")
        ) ||
          3);
      setCellSize(size);
      const pad = Number.parseFloat(getComputedStyle(el).paddingTop);
      setMask(edgeMask(el.offsetHeight, pad, size, matrix));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [cell, matrix]);

  const glyphs = layout(
    formatter,
    value,
    shown.value,
    effect === "roll" ? 0 : null
  );
  const resolvedDuration = duration ?? (effect === "roll" ? 1400 : MOTION.slow);
  const Slot = effect === "roll" ? RollSlot : DissolveSlot;
  let digitIndex = 0;

  const rootStyle: CSSProperties & Record<`--${string}`, string> = {
    "--number-cell": `${cellSize}px`,
    "--number-pad": "0.3em",
    ...style,
  };

  return (
    <span
      {...rest}
      ref={ref}
      className={cn(
        "inline-grid tabular-nums [font-kerning:none] [font-variant-ligatures:none]",
        className
      )}
      style={rootStyle}
    >
      {effect === "dissolve" ? (
        <style href={`dcn-number-${matrix}`} precedence="default">
          {dissolveKeyframes(matrix)}
        </style>
      ) : null}
      <span
        aria-hidden="true"
        className="pointer-events-none flex items-start [grid-area:1/1] select-none forced-colors:hidden"
      >
        {glyphs.map((glyph) => {
          if (glyph.kind === "static") {
            return (
              <span key={glyph.key} className={STATIC_CLASS}>
                {glyph.char}
              </span>
            );
          }
          const slotIndex = digitIndex;
          digitIndex += 1;
          return (
            <span
              key={glyph.key}
              ref={slotIndex === 0 ? windowRef : undefined}
              className="relative -my-[var(--number-pad)] block overflow-hidden py-[var(--number-pad)]"
              style={effect === "roll" ? (mask ?? undefined) : undefined}
            >
              <Slot
                digit={glyph.digit}
                direction={shown.direction}
                spin={shown.delta >= 10 ** (glyph.place + 1)}
                duration={resolvedDuration}
                delay={slotIndex * 45}
                matrix={matrix}
              />
            </span>
          );
        })}
      </span>
      <span className="text-transparent [grid-area:1/1] forced-colors:text-[CanvasText]">
        {formatter
          .format(value)
          .split(DIGIT_RUNS)
          .map((run, index) =>
            // Split with a capture group: odd entries are digit runs, kept as
            // one text node each so the number is read as a whole.
            index % 2 === 1 ? (
              run
            ) : (
              <span key={index} className={STATIC_CLASS}>
                {run}
              </span>
            )
          )}
      </span>
    </span>
  );
};
