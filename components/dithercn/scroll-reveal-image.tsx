"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps, CSSProperties, RefObject } from "react";

import {
  CANVAS_CLASS,
  LoadingField,
  paintFrame,
  splitLook,
  useDitherSource,
} from "@/components/dithercn/dither-image";
import type { DitherLook } from "@/components/dithercn/dither-image";
import {
  ditherMaskStyle,
  useInView,
  usePrefersReducedMotion,
} from "@/lib/dither";
import { cn } from "@/lib/utils";

export type ScrollRevealImageProps = Omit<ComponentProps<"div">, "children"> &
  DitherLook & {
    /** Image URL. Cross-origin images need CORS headers. */
    src: string;
    /** Describes the image. Pass `""` for a decorative image. */
    alt: string;
    /**
     * Where the reveal ends: the photo itself, or the finest dither.
     * Default `"photo"`.
     */
    end?: "photo" | "dither";
    /** How many cells wide the first, coarsest blocks are. Default 24. */
    coarsest?: number;
    /**
     * Where the image's top edge is when the reveal starts, as a share of
     * the scroll area's height from the top. 1 is the bottom edge.
     * Default 1.
     */
    start?: number;
    /** Where the top edge is when the reveal finishes. Default 0.3. */
    finish?: number;
    /**
     * The element that scrolls, if not the page. The reveal measures
     * against its box instead of the viewport.
     */
    scrollRoot?: RefObject<HTMLElement | null>;
    /**
     * Set the progress yourself, 0 to 1, instead of following the scroll.
     */
    progress?: number;
    /** Called when the scroll progress changes, 0 to 1. */
    onProgressChange?: (progress: number) => void;
    /** Width over height. Default: the image's own ratio. */
    ratio?: number;
  };

// The share of the progress spent on dither; the rest dissolves to the photo.
const DITHER_SHARE = 0.78;
// Coarseness steps between the first blocks and full detail.
const LADDER_STEPS = 9;
// Progress is kept to this many steps, so a scroll pass makes few renders.
const PRECISION = 240;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Coarseness from `coarsest` down to 1 in even steps on a log scale, so
 * every step looks like the same amount of sharpening.
 */
const ladderOf = (coarsest: number): readonly number[] => {
  const top = Math.max(1, coarsest);
  const steps = Array.from({ length: LADDER_STEPS }, (_, index) =>
    Math.max(1, Math.round(top ** (1 - index / (LADDER_STEPS - 1))))
  );
  return [...new Set(steps)];
};

/** What the image shows at `progress`. */
const stageAt = (
  progress: number,
  ladder: readonly number[],
  end: "photo" | "dither"
) => {
  const ditherEnd = end === "photo" ? DITHER_SHARE : 1;
  const along = clamp01(progress / ditherEnd);
  const index = Math.min(ladder.length - 1, Math.floor(along * ladder.length));
  const photo =
    end === "photo" ? clamp01((progress - ditherEnd) / (1 - ditherEnd)) : 0;
  return { factor: ladder[index] ?? 1, photo };
};

/** The photo arrives through a dither mask on a grid of double cells. */
const photoStyleAt = ({
  photo,
  fit,
  cell,
}: {
  photo: number;
  fit: CSSProperties["objectFit"];
  cell: number;
}): CSSProperties =>
  photo >= 1
    ? { objectFit: fit }
    : { objectFit: fit, ...ditherMaskStyle(photo, { cell: cell * 2 }) };

/** Progress from the scroll position, only while the image is near view. */
const useScrollProgress = ({
  rootRef,
  scrollRoot,
  start,
  finish,
  enabled,
}: {
  rootRef: RefObject<HTMLElement | null>;
  scrollRoot: RefObject<HTMLElement | null> | undefined;
  start: number;
  finish: number;
  enabled: boolean;
}) => {
  const inView = useInView(rootRef, { rootMargin: "80px" });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!(enabled && inView)) {
      return;
    }
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = rootRef.current;
      if (!el) {
        return;
      }
      const box = scrollRoot?.current?.getBoundingClientRect();
      const top = box?.top ?? 0;
      const height = box?.height ?? window.innerHeight;
      const edge = (el.getBoundingClientRect().top - top) / height;
      const span = start - finish || 1;
      const next = clamp01((start - edge) / span);
      setProgress(Math.round(next * PRECISION) / PRECISION);
    };
    const schedule = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(measure);
      }
    };
    measure();
    // Capture catches scrolls of any container, not only the page.
    window.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      window.cancelAnimationFrame(frame);
    };
  }, [enabled, inView, rootRef, scrollRoot, start, finish]);

  return progress;
};

/**
 * An image that resolves as it scrolls into view: coarse dithered blocks
 * that sharpen to full detail and then dissolve, cell by cell, into the
 * photo. Progress follows the scroll position, so scrolling back reverses
 * it. Under reduced motion it shows the finished image.
 */
export const ScrollRevealImage = (allProps: ScrollRevealImageProps) => {
  const { look, rest } = splitLook(allProps);
  const {
    src,
    alt,
    end = "photo",
    coarsest = 24,
    start = 1,
    finish = 0.3,
    scrollRoot,
    progress: controlled,
    onProgressChange,
    ratio,
    className,
    style,
    ...props
  } = rest;
  const { fit } = look.tone;
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const { image, render, status } = useDitherSource(rootRef, src, look);
  const scrolled = useScrollProgress({
    enabled: controlled === undefined && !reducedMotion,
    finish,
    rootRef,
    scrollRoot,
    start,
  });
  const progress = reducedMotion ? 1 : clamp01(controlled ?? scrolled);
  const { factor, photo } = stageAt(progress, ladderOf(coarsest), end);

  const onChangeRef = useRef(onProgressChange);
  useEffect(() => {
    onChangeRef.current = onProgressChange;
  }, [onProgressChange]);
  useEffect(() => {
    onChangeRef.current?.(progress);
  }, [progress]);

  useEffect(() => {
    if (render) {
      paintFrame(canvasRef.current, render(factor));
    }
  }, [render, factor]);

  const naturalRatio = image ? image.naturalWidth / image.naturalHeight : null;
  const rootStyle: CSSProperties = {
    aspectRatio: ratio ?? naturalRatio ?? undefined,
    ...style,
  };
  const photoStyle = photoStyleAt({ cell: look.cell, fit, photo });
  const decorative = alt === "";
  let stage = factor === 1 ? "fine" : "coarse";
  if (photo >= 1) {
    stage = "photo";
  }

  return (
    <div
      {...props}
      ref={rootRef}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative ? true : undefined}
      data-state={status}
      data-stage={stage}
      className={cn("relative overflow-hidden", className)}
      style={rootStyle}
    >
      <LoadingField visible={!render} cell={look.cell} />
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn(CANVAS_CLASS, render ? "opacity-100" : "opacity-0")}
      />
      {end === "photo" && photo > 0 && status === "ready" && (
        // The finished state is the real photo, not a canvas copy.
        // oxlint-disable-next-line nextjs/no-img-element
        <img
          src={src}
          alt=""
          aria-hidden
          draggable={false}
          decoding="async"
          className="pointer-events-none absolute inset-0 size-full"
          style={photoStyle}
        />
      )}
    </div>
  );
};
