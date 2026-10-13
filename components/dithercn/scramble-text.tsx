"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HTMLAttributes } from "react";

import { useFrameLoop, useInView, usePrefersReducedMotion } from "@/lib/dither";
import { cn } from "@/lib/utils";

/** Shade blocks and quadrants: the scramble decodes out of a dither. */
export const SCRAMBLE_DITHER = "░▒▓▖▗▘▝▚▞";
/** Capital letters and digits, for a terminal-style decode. */
export const SCRAMBLE_ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
/** Zeros and ones. */
export const SCRAMBLE_BINARY = "01";

export type ScrambleTextTag = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";

export type ScrambleTextProps = Omit<
  HTMLAttributes<HTMLElement>,
  "children"
> & {
  /** The final text. It is what screen readers, search and copy see. */
  children: string;
  /** The element to render. Default `"span"`. */
  as?: ScrambleTextTag;
  /**
   * When to play. `"hover"` plays when the closest link or button (or the
   * text itself) is hovered or focused. Default `"in-view"`.
   */
  trigger?: "mount" | "in-view" | "hover";
  /** Glyphs to cycle through. Default `SCRAMBLE_DITHER`. */
  characters?: string;
  /** Milliseconds until the last character settles. Default 900. */
  duration?: number;
  /** Milliseconds before the first character settles. Default 240. */
  delay?: number;
  /** How many times a second each glyph changes. Default 18. */
  rate?: number;
};

interface Run {
  /** Seconds of loop time when the run started; set on the first frame. */
  start: number | null;
  /** Seconds since the last glyph change, per character. */
  ticks: number[];
}

const pick = (characters: readonly string[]) =>
  characters[Math.floor(Math.random() * characters.length)] ?? "";

/**
 * A decode effect: characters cycle through glyphs and settle left to
 * right into the final text. The real text sits underneath with kerning
 * and ligatures off, so the scrambled overlay matches it slot for slot
 * and the layout never shifts. Under reduced motion the text is static.
 */
export const ScrambleText = ({
  as: Tag = "span",
  children,
  trigger = "in-view",
  characters = SCRAMBLE_DITHER,
  duration = 900,
  delay = 240,
  rate = 18,
  className,
  ...rest
}: ScrambleTextProps) => {
  const ref = useRef<HTMLElement>(null);
  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);
  const glyphRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const runRef = useRef<Run>({ start: null, ticks: [] });
  const reducedMotion = usePrefersReducedMotion();
  const inView = useInView(ref, { rootMargin: "0px 0px -8% 0px" });
  const [running, setRunning] = useState(false);
  const [played, setPlayed] = useState(false);

  const glyphs = [...characters];
  const chars = [...children];

  const play = useCallback(() => {
    if (reducedMotion) {
      return;
    }
    runRef.current = { start: null, ticks: [] };
    setRunning(true);
  }, [reducedMotion]);

  useEffect(() => {
    if (played) {
      return;
    }
    if (trigger === "mount" || (trigger === "in-view" && inView)) {
      setPlayed(true);
      play();
    }
  }, [inView, play, played, trigger]);

  useEffect(() => {
    const el = ref.current;
    if (trigger !== "hover" || !el) {
      return;
    }
    const host = el.closest("a, button, [role=button]") ?? el;
    host.addEventListener("pointerenter", play);
    host.addEventListener("focusin", play);
    return () => {
      host.removeEventListener("pointerenter", play);
      host.removeEventListener("focusin", play);
    };
  }, [play, trigger]);

  // Replay when the text changes after the first run.
  const previous = useRef(children);
  useEffect(() => {
    if (previous.current !== children) {
      previous.current = children;
      play();
    }
  }, [children, play]);

  useFrameLoop(
    (time, delta) => {
      const run = runRef.current;
      run.start ??= time;
      const elapsed = (time - run.start) * 1000;
      const span = Math.max(1, chars.length - 1);
      const interval = 1 / Math.max(1, rate);
      let settled = 0;
      for (const [index, char] of chars.entries()) {
        const glyph = glyphRefs.current[index];
        if (!glyph) {
          settled += 1;
          continue;
        }
        const settleAt = delay + (duration - delay) * (index / span);
        if (char.trim() === "" || elapsed >= settleAt) {
          glyph.textContent = char;
          glyph.dataset.settled = "";
          settled += 1;
          continue;
        }
        const tick = (run.ticks[index] ?? Infinity) + delta;
        if (tick >= interval) {
          glyph.textContent = pick(glyphs);
          run.ticks[index] = 0;
        } else {
          run.ticks[index] = tick;
        }
      }
      if (settled === chars.length) {
        setRunning(false);
      }
    },
    { enabled: running, fps: 60, target: ref }
  );

  return (
    <Tag
      {...rest}
      ref={setRef}
      data-state={running ? "running" : "idle"}
      className={cn(
        "inline-grid [font-kerning:none] [font-variant-ligatures:none]",
        className
      )}
    >
      <span className={cn("[grid-area:1/1]", running && "text-transparent")}>
        {children}
      </span>
      {running ? (
        <span
          aria-hidden="true"
          className="pointer-events-none [grid-area:1/1] select-none"
        >
          {chars.map((char, index) => (
            <span
              // Characters are positional slots; the index is the identity.
              // oxlint-disable-next-line no-array-index-key
              key={index}
              className="relative"
            >
              <span className="invisible">{char}</span>
              <span
                ref={(node) => {
                  glyphRefs.current[index] = node;
                }}
                data-settled={char.trim() === "" ? "" : undefined}
                className="text-dither-ink data-settled:text-current absolute inset-0 overflow-clip text-center"
              >
                {char.trim() === ""
                  ? char
                  : (glyphs[index % glyphs.length] ?? "")}
              </span>
            </span>
          ))}
        </span>
      ) : null}
    </Tag>
  );
};
