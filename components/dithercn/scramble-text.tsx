"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties, HTMLAttributes } from "react";

import {
  cssColor,
  ditherMask,
  useFrameLoop,
  useInView,
  usePrefersReducedMotion,
} from "@/lib/dither";
import type { DitherColor } from "@/lib/dither";
import { cn } from "@/lib/utils";

/**
 * How an unsettled character looks.
 * `dither`: a dithered block that thickens, then a few glyphs, then the letter.
 * `blocks`: only the block, filling in through every dither level.
 * `glyphs`: only glyphs, the classic decode.
 */
export const SCRAMBLE_MODES = ["dither", "blocks", "glyphs"] as const;
export type ScrambleMode = (typeof SCRAMBLE_MODES)[number];

/**
 * When the effect plays. Every trigger also plays when `children`
 * changes, scrambling from the old text to the new one.
 * `change` plays only then, never on its own.
 */
export const SCRAMBLE_TRIGGERS = [
  "mount",
  "in-view",
  "hover",
  "change",
] as const;
export type ScrambleTrigger = (typeof SCRAMBLE_TRIGGERS)[number];

/** `running` shows a caret at the leading edge while the text resolves; `always` keeps it blinking at the end afterwards. */
export const SCRAMBLE_CARETS = ["none", "running", "always"] as const;
export type ScrambleCaret = (typeof SCRAMBLE_CARETS)[number];

/** Lowercase letters, digits and a few marks: a quieter set for mono labels. */
export const SCRAMBLE_MONO = "abcdefghijklmnopqrstuvwxyz0123456789/+=-_";
/** Hex digits, for hashes and IDs. */
export const SCRAMBLE_HEX = "0123456789abcdef";

export type ScrambleTextTag = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";

export type ScrambleTextProps = Omit<
  HTMLAttributes<HTMLElement>,
  "children" | "color"
> & {
  /** The final text. It is what screen readers, search and copy see. */
  children: string;
  /** The element to render. Default `"span"`. */
  as?: ScrambleTextTag;
  /**
   * When to play. `"hover"` plays when the closest link or button (or the
   * text itself) is hovered or focused. Default `"in-view"`.
   */
  trigger?: ScrambleTrigger;
  /** How unsettled characters look. Default `"dither"`. */
  mode?: ScrambleMode;
  /**
   * Glyphs to cycle through. Default: the letters of the text itself, so
   * the scramble stays in the same typeface and voice.
   */
  characters?: string;
  /** Colour of blocks, glyphs and the caret: a palette name or any CSS colour. Settled letters fade from it to the text colour. Default `"ink"`. */
  color?: DitherColor;
  /** Milliseconds one character takes to resolve. Default 520. */
  duration?: number;
  /** Milliseconds between one character starting and the next. Default 34. */
  stagger?: number;
  /** Milliseconds before the first character starts. Default 0. */
  delay?: number;
  /** Multiplies every timing: 2 plays twice as fast. Default 1. */
  speed?: number;
  /** Glyph changes per second while a character is unsettled. Default 20. */
  rate?: number;
  /** A caret at the leading edge. Default `"none"`. */
  caret?: ScrambleCaret;
  /** Dither cell in CSS pixels. Default: about 1/22 of the font size, at least 1. */
  cell?: number;
  /** Called when every character has settled. */
  onComplete?: () => void;
};

type Phase = "wait" | "old" | "block" | "glyph" | "done";

interface Run {
  /** Loop seconds when the run started; set on the first frame. */
  start: number | null;
  /** What each slot shows before it starts. `null`: nothing (a reveal). */
  from: string | null;
  /** Leave characters that already match `from` alone. */
  keepSame: boolean;
  /** Seconds since each slot last changed glyph or level. */
  ticks: number[];
}

interface Timing {
  duration: number;
  stagger: number;
  delay: number;
  rate: number;
}

const LEVELS = 16;
// Mask images per dither level, built once.
const MASKS = Array.from({ length: LEVELS + 1 }, (_, level) =>
  ditherMask(level / LEVELS)
);

// A cheap stable hash in [0, 1) so the stagger has a little irregularity
// that is the same on every replay.
const jitter = (index: number) => {
  const s = Math.sin(index * 91.17 + 7.31) * 43_758.5453;
  return s - Math.floor(s);
};

const easeOut = (t: number) => 1 - (1 - t) ** 3;

const pick = (pool: readonly string[]) =>
  pool[Math.floor(Math.random() * pool.length)] ?? "";

const glyphPool = (text: string, characters: string | undefined) => {
  const source = characters ?? text.replaceAll(/\s/gu, "");
  const pool = [...new Set(source)];
  return pool.length >= 4 ? pool : [...pool, ..."0123456789"];
};

interface SlotFrame {
  phase: Phase;
  /** Dither level 0..16 for the block phase. */
  level: number;
}

/** What slot `index` shows `elapsed` ms into a run. Pure. */
const slotFrame = (
  {
    order,
    elapsed,
    mode,
    timing,
  }: { order: number; elapsed: number; mode: ScrambleMode; timing: Timing },
  before: Phase
): SlotFrame => {
  const offset = (jitter(order) - 0.5) * timing.stagger * 1.4;
  const start = Math.max(0, timing.delay + order * timing.stagger + offset);
  const progress = (elapsed - start) / timing.duration;
  if (progress < 0) {
    return { level: 0, phase: before };
  }
  if (progress >= 1) {
    return { level: LEVELS, phase: "done" };
  }
  if (mode === "glyphs") {
    return { level: 0, phase: "glyph" };
  }
  if (mode === "blocks") {
    return {
      // Stops short of solid, so the block always reads as a dither.
      level: Math.max(1, Math.round(easeOut(progress) * 13)),
      phase: "block",
    };
  }
  // dither: the block thickens over the first 60%, then glyphs flicker.
  if (progress < 0.6) {
    return {
      level: Math.max(1, Math.round(easeOut(progress / 0.6) * 12)),
      phase: "block",
    };
  }
  return { level: 0, phase: "glyph" };
};

const setMask = (block: Element | null | undefined, level: number) => {
  if (!(block instanceof HTMLElement)) {
    return;
  }
  // Shimmer one level either side of the target.
  const shimmer = Math.round(Math.random() * 2 - 1);
  const image = MASKS[Math.min(14, Math.max(1, level + shimmer))] ?? "none";
  block.style.maskImage = image;
  block.style.setProperty("-webkit-mask-image", image);
};

interface DrawSlot {
  slot: HTMLSpanElement | null | undefined;
  char: string;
  index: number;
  order: number;
  run: Run;
  elapsed: number;
  delta: number;
  interval: number;
  mode: ScrambleMode;
  timing: Timing;
  pool: readonly string[];
}

/** Write one slot's frame to the DOM and return its phase. */
const drawSlot = ({
  slot,
  char,
  index,
  order,
  run,
  elapsed,
  delta,
  interval,
  mode,
  timing,
  pool,
}: DrawSlot): Phase => {
  const old = run.from?.[index];
  if (!slot || (run.keepSame && old === char)) {
    if (slot) {
      slot.dataset.phase = "done";
    }
    return "done";
  }
  const before = old === undefined || old.trim() === "" ? "wait" : "old";
  const frame = slotFrame({ elapsed, mode, order, timing }, before);
  slot.dataset.phase = frame.phase;
  const [, block, glyph] = slot.children;
  const tick = (run.ticks[index] ?? Infinity) + delta;
  if (frame.phase === "old" && glyph) {
    glyph.textContent = old ?? "";
  } else if (tick < interval) {
    run.ticks[index] = tick;
  } else {
    run.ticks[index] = 0;
    if (frame.phase === "glyph" && glyph) {
      glyph.textContent = pick(pool);
    } else if (frame.phase === "block") {
      setMask(block, frame.level);
    }
  }
  return frame.phase;
};

interface Word {
  space: string;
  slots: { char: string; index: number; order: number }[];
}

/** Words of slots, numbered by position (`index`) and by reading order of visible characters (`order`). */
const splitWords = (text: string): Word[] => {
  let index = 0;
  let order = 0;
  return text.split(/(\s+)/u).map((part) => {
    if (part === "" || part.trim() === "") {
      index += [...part].length;
      return { slots: [], space: part };
    }
    const slots = [...part].map((char) => {
      const slot = { char, index, order };
      index += 1;
      order += 1;
      return slot;
    });
    return { slots, space: "" };
  });
};

const SLOT_CLASS =
  "group/slot inline-grid items-baseline justify-items-center [grid-template-areas:'s']";
const ITEM_CLASS = "[grid-area:s]";

/**
 * A decode effect with no layout shift. Each character resolves on its
 * own, slightly staggered: a dithered block thickens through the dither
 * levels, a few glyphs flicker, and the letter settles, fading from the
 * accent colour to the text colour. Changing `children` scrambles only
 * the characters that differ, from the old text to the new one.
 */
export const ScrambleText = ({
  as: Tag = "span",
  children,
  trigger = "in-view",
  mode = "dither",
  characters,
  color = "ink",
  duration = 520,
  stagger = 34,
  delay = 0,
  speed = 1,
  rate = 20,
  caret = "none",
  cell,
  onComplete,
  className,
  style,
  ...rest
}: ScrambleTextProps) => {
  const ref = useRef<HTMLElement>(null);
  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);
  const overlayRef = useRef<HTMLSpanElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const slotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const runRef = useRef<Run>({
    from: null,
    keepSame: false,
    start: null,
    ticks: [],
  });
  const reducedMotion = usePrefersReducedMotion();
  const inView = useInView(ref, { rootMargin: "0px 0px -8% 0px" });
  const [running, setRunning] = useState(false);
  // Before the first run the text waits hidden (client only; without
  // JavaScript it simply shows).
  const [waiting, setWaiting] = useState(false);
  const playedRef = useRef(false);
  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  });

  const chars = [...children];
  const words = splitWords(children);
  const pool = glyphPool(children, characters);
  const pace = Math.max(0.05, speed);
  const timing: Timing = {
    delay: delay / pace,
    duration: Math.max(1, duration / pace),
    rate: rate * pace,
    stagger: stagger / pace,
  };

  const play = useCallback(
    (from: string | null, keepSame: boolean) => {
      playedRef.current = true;
      setWaiting(false);
      if (reducedMotion) {
        return;
      }
      runRef.current = { from, keepSame, start: null, ticks: [] };
      setRunning(true);
    },
    [reducedMotion]
  );

  useLayoutEffect(() => {
    const reveals = trigger === "mount" || trigger === "in-view";
    if (!(reducedMotion || playedRef.current) && reveals) {
      setWaiting(true);
    }
    // Only the first mount waits.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (playedRef.current) {
      return;
    }
    if (trigger === "mount" || (trigger === "in-view" && inView)) {
      play(null, false);
    }
  }, [inView, play, trigger]);

  useEffect(() => {
    const el = ref.current;
    if (trigger !== "hover" || !el) {
      return;
    }
    const host = el.closest("a, button, [role=button]") ?? el;
    const replay = () => play(el.textContent, false);
    host.addEventListener("pointerenter", replay);
    host.addEventListener("focusin", replay);
    return () => {
      host.removeEventListener("pointerenter", replay);
      host.removeEventListener("focusin", replay);
    };
  }, [play, trigger]);

  // A new text scrambles from the old one; matching characters stay put.
  const previous = useRef(children);
  useEffect(() => {
    if (previous.current !== children) {
      const from = previous.current;
      previous.current = children;
      play(from, true);
    }
  }, [children, play]);

  // Size the dither cells to the type.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const fontSize = Number.parseFloat(getComputedStyle(el).fontSize) || 16;
    el.style.setProperty(
      "--scramble-cell",
      `${cell ?? Math.max(1, Math.round(fontSize / 22))}px`
    );
  }, [cell, running]);

  // Place the caret after the furthest slot that has started.
  const placeCaret = useCallback((lead: number, visible: boolean) => {
    const node = caretRef.current;
    const slot = slotRefs.current[lead];
    if (!node) {
      return;
    }
    if (!slot || !visible) {
      node.style.opacity = "0";
      return;
    }
    const height = slot.offsetHeight * 0.8;
    node.style.opacity = "1";
    node.style.height = `${height}px`;
    node.style.transform = `translate(${slot.offsetLeft + slot.offsetWidth}px, ${slot.offsetTop + (slot.offsetHeight - height) / 2}px)`;
  }, []);

  const lastSlot = chars.findLastIndex((char) => char.trim() !== "");

  // When idle with a persistent caret, park it after the last character.
  useLayoutEffect(() => {
    if (running || caret !== "always") {
      return;
    }
    const park = () => placeCaret(lastSlot, !waiting);
    park();
    const overlay = overlayRef.current;
    if (!overlay) {
      return;
    }
    const observer = new ResizeObserver(park);
    observer.observe(overlay);
    return () => observer.disconnect();
  }, [caret, lastSlot, placeCaret, running, waiting, children]);

  useFrameLoop(
    (time, delta) => {
      // The loop also calls once while disabled, for a still frame.
      if (!running) {
        return;
      }
      const run = runRef.current;
      run.start ??= time;
      const elapsed = (time - run.start) * 1000;
      const interval = 1 / Math.max(1, timing.rate);
      let settled = 0;
      let lead = -1;
      for (const word of words) {
        for (const { char, index, order } of word.slots) {
          const phase = drawSlot({
            char,
            delta,
            elapsed,
            index,
            interval,
            mode,
            order,
            pool,
            run,
            slot: slotRefs.current[index],
            timing,
          });
          if (phase === "done") {
            settled += 1;
          } else if (phase === "block" || phase === "glyph") {
            lead = Math.max(lead, index);
          }
        }
      }
      const visibleCount = chars.filter((char) => char.trim() !== "").length;
      placeCaret(lead, caret !== "none" && lead !== -1);
      if (settled >= visibleCount) {
        // Hand the slots back to their idle state for a parked caret.
        for (const slot of slotRefs.current) {
          if (slot) {
            slot.dataset.phase = "idle";
          }
        }
        setRunning(false);
        completeRef.current?.();
      }
    },
    { enabled: running, fps: 60, target: ref }
  );

  const rootStyle: CSSProperties & Record<"--scramble-color", string> = {
    "--scramble-color": cssColor(color),
    ...style,
  };
  const showOverlay = running || caret === "always";
  let rootState = "idle";
  if (running) {
    rootState = "running";
  } else if (waiting) {
    rootState = "waiting";
  }

  return (
    <Tag
      {...rest}
      ref={setRef}
      data-state={rootState}
      className={cn(
        "inline-grid [font-kerning:none] [font-variant-ligatures:none]",
        className
      )}
      style={rootStyle}
    >
      <span
        className={cn(
          "[grid-area:1/1]",
          (running || waiting) && "text-transparent"
        )}
      >
        {children}
      </span>
      {showOverlay ? (
        <span
          ref={overlayRef}
          aria-hidden="true"
          className="pointer-events-none relative [grid-area:1/1] select-none"
        >
          {words.map((word, wordIndex) =>
            word.space === "" ? (
              <span
                // Words are positional; the index is the identity.
                // oxlint-disable-next-line no-array-index-key
                key={wordIndex}
                className="whitespace-nowrap"
              >
                {word.slots.map(({ char, index }) => (
                  <span
                    key={index}
                    ref={(node) => {
                      slotRefs.current[index] = node;
                    }}
                    data-phase={running ? "wait" : "idle"}
                    className={SLOT_CLASS}
                  >
                    <span
                      className={cn(
                        ITEM_CLASS,
                        "invisible text-(--scramble-color) transition-colors duration-700 ease-(--ease-out)",
                        "group-data-[phase=done]/slot:visible group-data-[phase=done]/slot:text-current"
                      )}
                    >
                      {char}
                    </span>
                    <span
                      className={cn(
                        ITEM_CLASS,
                        "hidden h-[0.7em] w-[82%] bg-(--scramble-color) group-data-[phase=block]/slot:block",
                        "[mask-repeat:repeat] [mask-size:calc(var(--scramble-cell)*4)] [-webkit-mask-repeat:repeat] [-webkit-mask-size:calc(var(--scramble-cell)*4)]"
                      )}
                    />
                    <span
                      className={cn(
                        ITEM_CLASS,
                        "hidden whitespace-pre text-(--scramble-color) opacity-80",
                        "group-data-[phase=glyph]/slot:block group-data-[phase=old]/slot:block group-data-[phase=old]/slot:text-current group-data-[phase=old]/slot:opacity-45"
                      )}
                    />
                  </span>
                ))}
              </span>
            ) : (
              word.space
            )
          )}
          {caret === "none" ? null : (
            <span
              ref={caretRef}
              className={cn(
                "absolute top-0 left-0 w-[max(2px,0.07em)] bg-(--scramble-color) opacity-0",
                !running &&
                  "motion-safe:animate-[dcn-caret_1.1s_steps(1)_infinite]"
              )}
            />
          )}
          {caret === "always" ? (
            <style href="dcn-scramble-caret" precedence="default">
              {"@keyframes dcn-caret{50%{visibility:hidden}}"}
            </style>
          ) : null}
        </span>
      ) : null}
    </Tag>
  );
};
