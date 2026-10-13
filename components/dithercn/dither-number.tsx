"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes, RefObject } from "react";

import {
  cssColor,
  ditherMask,
  getThresholdMap,
  MOTION,
  thresholdAt,
  useInView,
  usePrefersReducedMotion,
} from "@/lib/dither";
import type { DitherColor, DitherMatrix } from "@/lib/dither";
import { cn } from "@/lib/utils";

/** The Bayer matrices. */
export type DitherNumberMatrix = Exclude<DitherMatrix, "blue-noise">;

/**
 * `roll`: each digit spins on a strip to its new value, faded at the top
 * and bottom by a dither.
 * `resolve`: each changed digit turns into the new one cell by cell, the
 * old digit giving up exactly the cells the new one takes.
 */
export const DITHER_NUMBER_EFFECTS = ["roll", "resolve"] as const;
export type DitherNumberEffect = (typeof DITHER_NUMBER_EFFECTS)[number];

/** Type presets, from a table cell up to a landing page stat. */
export const DITHER_NUMBER_SIZES = ["sm", "md", "lg", "xl", "display"] as const;
export type DitherNumberSize = (typeof DITHER_NUMBER_SIZES)[number];

const SIZE_CLASS = {
  display: "text-[clamp(3.5rem,11vw,8rem)] font-semibold tracking-[-0.06em]",
  lg: "text-6xl font-semibold tracking-[-0.05em]",
  md: "text-4xl font-semibold tracking-[-0.04em]",
  sm: "text-2xl font-semibold tracking-[-0.03em]",
  xl: "text-8xl font-semibold tracking-[-0.055em]",
} as const satisfies Record<DitherNumberSize, string>;

export type DitherNumberProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children" | "color" | "prefix"
> & {
  /** The number to show. Change it and the digits move to the new value. */
  value: number;
  /** Where the first run starts. Default 0. */
  from?: number;
  /** Passed to `Intl.NumberFormat`: currency, percent, compact notation, decimals. */
  format?: Intl.NumberFormatOptions;
  /** Passed to `Intl.NumberFormat`. Set it when the server and client must format the same way. Default: the visitor's locale. */
  locales?: Intl.LocalesArgument;
  /** Text before the number, such as `"+"` or `"~"`. */
  prefix?: string;
  /** Text after the number, such as `" ms"` or `" users"`. */
  suffix?: string;
  /** Classes for the prefix and suffix, for example a smaller, muted unit. */
  affixClassName?: string;
  /** How digits move. Default `"roll"`. */
  effect?: DitherNumberEffect;
  /** Start the first run on mount, or when scrolled into view. Default `"in-view"`. */
  trigger?: "mount" | "in-view";
  /** A type preset. Leave it unset to size the number with your own classes. */
  size?: DitherNumberSize;
  /** Colour of the number: a palette name or any CSS colour. Default: the text colour. */
  color?: DitherColor;
  /** Colour a digit takes while it moves, fading back as it lands. `"none"` keeps it the number's colour. Default `"ink"`. */
  accent?: DitherColor | "none";
  /** Milliseconds per change. Default 900 for roll, 560 for resolve. */
  duration?: number;
  /** Milliseconds between one digit starting and the next, left to right. Default 40. */
  stagger?: number;
  /** Threshold matrix for the dithered edges and the resolve. Default `"bayer4"`. */
  matrix?: DitherNumberMatrix;
  /** Cell size in CSS pixels. Default: about 1/30 of the font size, at least 1. */
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

// Decorative digits are drawn as generated content, so they stay out of
// the page's text (copy, search snippets); only the real value is text.
const GLYPH_CLASS = "before:content-[attr(data-digit)]";

/**
 * Tint a slot with the accent at once, then let it fade back to the
 * number's colour from `at` ms, over the rest of the motion.
 */
const flash = (el: HTMLElement, at: number, fade: number) => {
  el.style.transition = "none";
  el.style.color = "var(--number-accent)";
  el.getBoundingClientRect();
  el.style.transition = `color ${fade}ms ${MOTION.ease} ${at}ms`;
  el.style.color = "";
};

/** 1 counting up, -1 counting down, 0 to jump without motion. */
type Direction = 1 | -1 | 0;

interface Shown {
  direction: Direction;
  value: number;
  /** How far the shown digits moved in the last change, read as one integer. */
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
  accent: boolean;
}

// ---------------------------------------------------------------- roll

const COPIES = 3;
const ROWS = 10 * COPIES;
const STRIP = Array.from({ length: ROWS }, (_, index) => index % 10);

const translate = (row: number) => `translateY(${(-row * 100) / ROWS}%)`;

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

/** Start and end rows on the strip for a roll from `at` to `value`. */
const rollRows = ({
  at,
  value,
  direction,
  spin,
}: {
  at: number;
  value: number;
  direction: 1 | -1;
  spin: boolean;
}) => {
  const extra = spin ? 10 : 0;
  if (direction === 1) {
    return { end: value + (value > at ? 0 : 10) + extra, start: at };
  }
  return { end: value + 20 - (value < at ? 0 : 10) - extra, start: at + 20 };
};

const RollSlot = ({
  digit,
  direction,
  spin,
  duration,
  delay,
  accent,
}: SlotProps) => {
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
    const { start, end } = rollRows({ at, direction, spin, value });
    if (Math.abs(end - start) < 0.01) {
      return;
    }
    // Accent first, with no transition, then roll and fade it back.
    const color = accent
      ? `color ${duration * 0.8}ms ${MOTION.ease} ${delay + duration * 0.45}ms`
      : "";
    strip.style.transition = "none";
    strip.style.transform = translate(start);
    strip.style.color = accent ? "var(--number-accent)" : "";
    // Commit the start row before transitioning from it.
    strip.getBoundingClientRect();
    strip.style.transition = [
      `transform ${duration}ms ${MOTION.ease} ${delay}ms`,
      color,
    ]
      .filter(Boolean)
      .join(", ");
    strip.style.transform = translate(end);
    strip.style.color = "";
    const settle = (event: TransitionEvent) => {
      if (event.propertyName !== "transform") {
        return;
      }
      // Jump back to the middle copy without motion; a colour fade in
      // flight keeps running.
      strip.style.transition = color || "none";
      strip.style.transform = translate(value + 10);
      strip.removeEventListener("transitionend", settle);
    };
    strip.addEventListener("transitionend", settle);
    return () => strip.removeEventListener("transitionend", settle);
  }, [accent, delay, direction, duration, spin, value]);

  return (
    <span
      ref={stripRef}
      className="absolute inset-x-0 top-(--number-pad) flex flex-col items-center will-change-transform"
      style={{ transform: translate(initialRow) }}
    >
      {STRIP.map((row, index) => (
        <span key={index} data-digit={row} className={`block ${GLYPH_CLASS}`} />
      ))}
    </span>
  );
};

// ------------------------------------------------------------- resolve

const RESOLVE_STEPS: Record<DitherNumberMatrix, number> = {
  bayer2: 4,
  bayer4: 16,
  bayer8: 16,
};
const resolveSheets = new Map<DitherNumberMatrix, string>();

// The old digit uses the complement of the new one's mask: a solid layer
// with the dither excluded. Every cell shows one digit or the other.
const SOLID = "linear-gradient(#000 0 0)";
const CLEAR = "linear-gradient(transparent 0 0)";

/**
 * Keyframes stepping a mask through the matrix's levels with an ease-out
 * shape: level k lands at t where 1 - (1 - t)^2 = k / steps.
 */
const resolveKeyframes = (matrix: DitherNumberMatrix) => {
  const cached = resolveSheets.get(matrix);
  if (cached !== undefined) {
    return cached;
  }
  const steps = RESOLVE_STEPS[matrix];
  const levels = Array.from({ length: steps + 1 }, (_, k) => k);
  const frame = (k: number, out: boolean) => {
    const offset = ((1 - Math.sqrt(1 - k / steps)) * 100).toFixed(2);
    const dither = ditherMask(k / steps, { matrix });
    let image = dither;
    if (k >= steps) {
      image = out ? CLEAR : "none";
    } else if (out) {
      image = `${SOLID},${dither}`;
    }
    return `${offset}%{-webkit-mask-image:${image};mask-image:${image}}`;
  };
  const css = `@keyframes dcn-number-in-${matrix}{${levels.map((k) => frame(k, false)).join("")}}@keyframes dcn-number-out-${matrix}{${levels.map((k) => frame(k, true)).join("")}}`;
  resolveSheets.set(matrix, css);
  return css;
};

interface Layer {
  id: number;
  digit: number | null;
  leaving: boolean;
}

const layerStyle = ({
  layer,
  matrix,
  duration,
  delay,
}: {
  layer: Layer;
  matrix: DitherNumberMatrix;
  duration: number;
  delay: number;
}): CSSProperties => {
  const tile = `calc(var(--number-cell) * ${getThresholdMap(matrix).size})`;
  const name = layer.leaving ? "dcn-number-out" : "dcn-number-in";
  return {
    WebkitMaskComposite: "xor",
    WebkitMaskRepeat: "repeat",
    WebkitMaskSize: tile,
    animation: `${name}-${matrix} ${duration}ms step-end ${delay}ms both`,
    maskComposite: "exclude",
    maskRepeat: "repeat",
    maskSize: tile,
  };
};

const ResolveSlot = ({
  digit,
  direction,
  duration,
  delay,
  matrix,
  accent,
}: SlotProps) => {
  const [layers, setLayers] = useState<Layer[]>([
    { digit, id: 0, leaving: false },
  ]);
  const [current, setCurrent] = useState(digit);
  const newestRef = useRef<HTMLSpanElement>(null);

  // Adjust state during render when the digit changes (no effect needed).
  if (current !== digit) {
    setCurrent(digit);
    const id = (layers.at(-1)?.id ?? 0) + 1;
    setLayers(
      direction === 0
        ? [{ digit, id, leaving: false }]
        : [
            // Only the newest visible layer leaves; anything older is dropped.
            ...layers
              .filter((layer) => !layer.leaving)
              .map((layer) => ({ ...layer, leaving: true })),
            { digit, id, leaving: false },
          ]
    );
  }

  const newest = layers.at(-1);
  useLayoutEffect(() => {
    const el = newestRef.current;
    if (el && accent && newest && newest.id > 0 && direction !== 0) {
      flash(el, delay + duration * 0.5, duration * 1.2);
    }
  }, [accent, delay, direction, duration, newest]);

  return layers.map((layer) => (
    <span
      key={layer.id}
      ref={layer === newest ? newestRef : undefined}
      onAnimationEnd={() => {
        if (layer.leaving) {
          setLayers((list) => list.filter(({ id }) => id !== layer.id));
        }
      }}
      data-digit={layer.digit ?? ""}
      className={`absolute inset-0 text-center ${GLYPH_CLASS}`}
      style={
        // The first layer is static until it leaves.
        direction === 0 || (layer.id === 0 && !layer.leaving)
          ? undefined
          : layerStyle({ delay, duration, layer, matrix })
      }
    />
  ));
};

// --------------------------------------------------------- edge mask

/**
 * A mask for the roll window: solid across the middle of the line,
 * dithered out across the top and bottom `fade` share of it. Built per
 * measured size so the cells stay square.
 */
const edgeMask = ({
  height,
  cell,
  matrix,
  fade = 0.2,
}: {
  height: number;
  cell: number;
  matrix: DitherNumberMatrix;
  fade?: number;
}): CSSProperties => {
  const { size } = getThresholdMap(matrix);
  const rows = Math.max(1, Math.round(height / cell));
  const fadeRows = Math.max(1, Math.round((height * fade) / cell));
  let path = "";
  for (let y = 0; y < rows; y += 1) {
    const edge = Math.min(y, rows - 1 - y);
    const level = edge >= fadeRows ? 1 : (edge + 0.5) / fadeRows;
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

// ------------------------------------------------------------- state

/**
 * What the digits show, and how they got there. The server renders the
 * final value; on the client the digits wait at `from` until triggered.
 */
const useShownValue = ({
  value,
  from,
  trigger,
  inView,
  formatter,
}: {
  value: number;
  from: number;
  trigger: "mount" | "in-view";
  inView: boolean;
  formatter: Intl.NumberFormat;
}) => {
  // Digits as one integer ("$4.12K" → 412), so a spin follows what is shown,
  // not the raw value behind compact notation or decimals.
  const digitsRef = useRef((input: number) =>
    Number(formatter.format(input).replaceAll(/\D/gu, "") || 0)
  );
  useEffect(() => {
    digitsRef.current = (input: number) =>
      Number(formatter.format(input).replaceAll(/\D/gu, "") || 0);
  });
  const reducedMotion = usePrefersReducedMotion();
  const [shown, setShown] = useState<Shown>({
    delta: 0,
    direction: 0,
    value,
  });
  const [armed, setArmed] = useState(false);
  const [started, setStarted] = useState(false);

  // Only the first mount waits at `from`.
  const fromRef = useRef(from);
  useLayoutEffect(() => {
    if (!reducedMotion) {
      setShown({ delta: 0, direction: 0, value: fromRef.current });
    }
    setArmed(true);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (armed && !started && (trigger === "mount" || inView)) {
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
    setShown((previous) =>
      previous.value === value
        ? previous
        : {
            delta: Math.abs(
              digitsRef.current(value) - digitsRef.current(previous.value)
            ),
            direction: value > previous.value ? 1 : -1,
            value,
          }
    );
  }, [armed, reducedMotion, started, value]);

  return shown;
};

/** Measure the type for square dither cells and the roll window mask. */
const useCells = ({
  rootRef,
  windowRef,
  cell,
  matrix,
}: {
  rootRef: RefObject<HTMLSpanElement | null>;
  windowRef: RefObject<HTMLSpanElement | null>;
  cell: number | undefined;
  matrix: DitherNumberMatrix;
}) => {
  const [mask, setMask] = useState<CSSProperties | null>(null);
  const [cellSize, setCellSize] = useState(cell ?? 2);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const measure = () => {
      const fontSize = Number.parseFloat(getComputedStyle(root).fontSize) || 16;
      const size = cell ?? Math.max(1, Math.round(fontSize / 30));
      setCellSize(size);
      const height = windowRef.current?.offsetHeight ?? 0;
      setMask(height > 0 ? edgeMask({ cell: size, height, matrix }) : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [cell, matrix, rootRef, windowRef]);

  return { cellSize, mask };
};

// --------------------------------------------------------------- root

/**
 * An animated number for dashboards and landing stats. Digits are
 * tabular, formatting comes from `Intl.NumberFormat`, and each changed
 * digit rolls or resolves through a dither into place, tinted with the
 * accent while it moves. The formatted value is real text laid over the
 * animation, so it is selectable and read by screen readers.
 */
export const DitherNumber = ({
  value,
  from = 0,
  format,
  locales,
  prefix,
  suffix,
  affixClassName,
  effect = "roll",
  trigger = "in-view",
  size,
  color,
  accent = "ink",
  duration,
  stagger = 40,
  matrix = "bayer4",
  cell,
  className,
  style,
  ...rest
}: DitherNumberProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const windowRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { rootMargin: "0px 0px -8% 0px" });
  const formatter = new Intl.NumberFormat(locales, format);
  const shown = useShownValue({ formatter, from, inView, trigger, value });
  const { cellSize, mask } = useCells({
    cell,
    matrix,
    rootRef: ref,
    windowRef,
  });

  const glyphs = layout(
    formatter,
    value,
    shown.value,
    effect === "roll" ? 0 : null
  );
  const resolvedDuration = duration ?? (effect === "roll" ? 900 : 560);
  const Slot = effect === "roll" ? RollSlot : ResolveSlot;
  let digitIndex = 0;

  const rootStyle: CSSProperties & Record<`--${string}`, string> = {
    "--number-accent": accent === "none" ? "currentColor" : cssColor(accent),
    "--number-cell": `${cellSize}px`,
    "--number-pad": "0.14em",
    ...(color === undefined ? {} : { color: cssColor(color) }),
    ...style,
  };
  const affix = (text: string | undefined, key: string) =>
    text === undefined ? null : (
      <span key={key} className={cn(STATIC_CLASS, affixClassName)}>
        {text}
      </span>
    );

  return (
    <span
      {...rest}
      ref={ref}
      className={cn(
        "inline-grid tabular-nums [font-kerning:none] [font-variant-ligatures:none]",
        size === undefined ? undefined : SIZE_CLASS[size],
        // After the size preset: tailwind-merge drops a line height that
        // comes before a font size.
        "leading-[1.1]",
        className
      )}
      style={rootStyle}
    >
      {effect === "resolve" ? (
        <style href={`dcn-number-${matrix}`} precedence="default">
          {resolveKeyframes(matrix)}
        </style>
      ) : null}
      <span
        aria-hidden="true"
        className="pointer-events-none [grid-area:1/1] whitespace-nowrap select-none forced-colors:hidden"
      >
        {affix(prefix, "prefix")}
        {glyphs.map((glyph) => {
          if (glyph.kind === "static") {
            return (
              <span
                key={glyph.key}
                data-digit={glyph.char}
                className={`${STATIC_CLASS} ${GLYPH_CLASS}`}
              />
            );
          }
          const slotIndex = digitIndex;
          digitIndex += 1;
          return (
            <span key={glyph.key} className="relative inline-block">
              <span data-digit="0" className={`invisible ${GLYPH_CLASS}`} />
              <span
                ref={slotIndex === 0 ? windowRef : undefined}
                className={cn(
                  "absolute overflow-clip",
                  // The roll window reaches a little past the line so the
                  // dithered fade sits mostly outside the glyphs.
                  effect === "roll"
                    ? "inset-x-0 -inset-y-(--number-pad)"
                    : "inset-0"
                )}
                style={effect === "roll" ? (mask ?? undefined) : undefined}
              >
                <Slot
                  digit={glyph.digit}
                  direction={shown.direction}
                  spin={shown.delta >= 10 ** (glyph.place + 1)}
                  duration={resolvedDuration}
                  delay={slotIndex * stagger}
                  matrix={matrix}
                  accent={accent !== "none"}
                />
              </span>
            </span>
          );
        })}
        {affix(suffix, "suffix")}
      </span>
      <span className="[grid-area:1/1] whitespace-nowrap text-transparent forced-colors:text-[CanvasText]">
        {affix(prefix, "prefix")}
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
        {affix(suffix, "suffix")}
      </span>
    </span>
  );
};
