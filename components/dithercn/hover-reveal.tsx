"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ComponentProps,
  FocusEvent,
  PointerEvent,
  RefObject,
} from "react";

import {
  CANVAS_CLASS,
  FADE_CLASS,
  IMAGE_CELL,
  sizeCanvas,
  useDitheredFrame,
} from "@/components/dithercn/dither-image";
import type { DitherGrid, ImageFit } from "@/components/dithercn/dither-image";
import {
  DEFAULT_PALETTE,
  thresholdAt,
  useFrameLoop,
  usePrefersReducedMotion,
} from "@/lib/dither";
import type { DitherMatrix, DitherMethod, DitherPalette } from "@/lib/dither";
import { cn } from "@/lib/utils";

export type RevealMode = "spotlight" | "dissolve";

export type HoverRevealProps = Omit<
  ComponentProps<"div">,
  | "children"
  | "onBlur"
  | "onFocus"
  | "onPointerDown"
  | "onPointerEnter"
  | "onPointerLeave"
  | "onPointerMove"
> & {
  /** Image URL. Cross-origin images need CORS headers. */
  src: string;
  /** Describes the image. Pass `""` for a decorative image. */
  alt: string;
  /**
   * `"spotlight"` opens a dithered hole that follows the pointer.
   * `"dissolve"` dissolves the whole dither away. Default `"spotlight"`.
   */
  reveal?: RevealMode;
  /** Spotlight radius in CSS pixels. Default 140. */
  radius?: number;
  /** Threshold pattern for the reveal's edge. Default `"bayer8"`. */
  revealMatrix?: DitherMatrix;
  /** Dither algorithm for the image. Default `"atkinson"`. */
  method?: DitherMethod;
  /** Two to four colours, darkest used for shadows. Default paper and ink. */
  palette?: DitherPalette;
  /** Size of one cell in CSS pixels. Default 2. */
  cell?: number;
  /** 1 leaves contrast alone. Default 1.2. */
  contrast?: number;
  /** Shifts every tone, from -1 to 1. Default 0. */
  brightness?: number;
  /** How the image fills its box, as in `object-fit`. Default `"cover"`. */
  fit?: ImageFit;
};

/** Where the reveal is heading, and where it is now. */
interface RevealState {
  x: number;
  y: number;
  radius: number;
  progress: number;
  targetX: number;
  targetY: number;
  targetRadius: number;
  targetProgress: number;
}

// Per-second rates for the exponential ease towards each target.
const FOLLOW_RATE = 14;
const RADIUS_RATE = 9;
const DISSOLVE_RATE = 6;

const approach = (value: number, target: number, rate: number, delta: number) =>
  value + (target - value) * (1 - Math.exp(-rate * delta));

const isSettled = (state: RevealState) =>
  Math.abs(state.radius - state.targetRadius) < 0.5 &&
  Math.abs(state.progress - state.targetProgress) < 0.002 &&
  Math.abs(state.x - state.targetX) < 0.5 &&
  Math.abs(state.y - state.targetY) < 0.5;

const settle = (state: RevealState) => {
  state.x = state.targetX;
  state.y = state.targetY;
  state.radius = state.targetRadius;
  state.progress = state.targetProgress;
};

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Copy the dithered pixels into `work`, then clear the cells the reveal
 * has opened: everywhere once the dissolve passes their threshold, and
 * inside the spotlight, whose edge feathers through the matrix.
 */
const punchReveal = ({
  pixels,
  work,
  grid,
  state,
  matrix,
}: {
  pixels: ImageData;
  work: ImageData;
  grid: DitherGrid;
  state: RevealState;
  matrix: DitherMatrix;
}) => {
  work.data.set(pixels.data);
  const { columns, rows } = grid;
  if (state.progress > 0) {
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        if (state.progress > thresholdAt(matrix, x, y)) {
          work.data[(y * columns + x) * 4 + 3] = 0;
        }
      }
    }
  }

  const cellsPerPixel = columns / grid.width;
  const reach = state.radius * cellsPerPixel;
  if (reach <= 0.5) {
    return;
  }
  const cx = state.x * cellsPerPixel;
  const cy = state.y * cellsPerPixel;
  const top = Math.max(0, Math.floor(cy - reach));
  const bottom = Math.min(rows - 1, Math.ceil(cy + reach));
  const left = Math.max(0, Math.floor(cx - reach));
  const right = Math.min(columns - 1, Math.ceil(cx + reach));
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / reach;
      const open = 1 - smoothstep(0.35, 1, distance);
      if (open > thresholdAt(matrix, x, y)) {
        work.data[(y * columns + x) * 4 + 3] = 0;
      }
    }
  }
};

const FIT_CLASS = {
  contain: "object-contain",
  cover: "object-cover",
} as const satisfies Record<ImageFit, string>;

const pointIn = (event: PointerEvent<HTMLDivElement>) => {
  const box = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - box.left, y: event.clientY - box.top };
};

type DitheredFrame = ReturnType<typeof useDitheredFrame>["frame"];

/**
 * The reveal's motion and input handling: pointer spotlight, dissolve,
 * tap and keyboard toggles, eased towards their targets on a frame loop
 * that runs only while something is moving.
 */
const useReveal = ({
  rootRef,
  canvasRef,
  frame,
  reveal,
  radius,
  matrix,
}: {
  rootRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  frame: DitheredFrame;
  reveal: RevealMode;
  radius: number;
  matrix: DitherMatrix;
}) => {
  const reducedMotion = usePrefersReducedMotion();
  const stateRef = useRef<RevealState>({
    progress: 0,
    radius: 0,
    targetProgress: 0,
    targetRadius: 0,
    targetX: 0,
    targetY: 0,
    x: 0,
    y: 0,
  });
  const workRef = useRef<ImageData | null>(null);
  const [moving, setMoving] = useState(false);
  // Touch and keyboard reveal the whole image; this tracks that toggle.
  const [revealed, setRevealed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const paint = () => {
    const context = canvasRef.current?.getContext("2d");
    if (!(context && frame)) {
      return;
    }
    if (workRef.current?.data.length !== frame.pixels.data.length) {
      workRef.current = new ImageData(frame.pixels.width, frame.pixels.height);
    }
    const work = workRef.current;
    punchReveal({
      grid: frame.grid,
      matrix,
      pixels: frame.pixels,
      state: stateRef.current,
      work,
    });
    context.putImageData(work, 0, 0);
  };

  const loop = useFrameLoop(
    (_time, delta) => {
      const state = stateRef.current;
      state.x = approach(state.x, state.targetX, FOLLOW_RATE, delta);
      state.y = approach(state.y, state.targetY, FOLLOW_RATE, delta);
      state.radius = approach(
        state.radius,
        state.targetRadius,
        RADIUS_RATE,
        delta
      );
      state.progress = approach(
        state.progress,
        state.targetProgress,
        DISSOLVE_RATE,
        delta
      );
      if (isSettled(state)) {
        settle(state);
        setMoving(false);
      }
      paint();
    },
    { enabled: moving && !reducedMotion, fps: 60, target: rootRef }
  );

  // Redraw the resting state whenever the dithered pixels change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!(canvas && frame)) {
      return;
    }
    sizeCanvas(canvas, frame.grid);
    paint();
    // `paint` reads refs and `frame`; redrawing on frame change is enough.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);

  const setTargets = (next: Partial<RevealState>) => {
    Object.assign(stateRef.current, next);
    if (!reducedMotion) {
      setMoving(true);
    }
  };

  const toggle = (next: boolean) => {
    setRevealed(next);
    setTargets({ targetProgress: next ? 1 : 0 });
  };

  const handlers = {
    onBlur: (event: FocusEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        toggle(false);
      }
    },
    onFocus: (event: FocusEvent<HTMLDivElement>) => {
      if (event.currentTarget.matches(":focus-visible")) {
        toggle(true);
      }
    },
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "touch") {
        toggle(!revealed);
      }
    },
    onPointerEnter: (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "touch") {
        return;
      }
      setHovered(true);
      if (reveal === "dissolve") {
        setTargets({ targetProgress: 1 });
        return;
      }
      const { x, y } = pointIn(event);
      // Open the spotlight under the pointer, not sliding in from a corner.
      const state = stateRef.current;
      if (state.radius < 1) {
        state.x = x;
        state.y = y;
      }
      setTargets({ targetRadius: radius, targetX: x, targetY: y });
    },
    onPointerLeave: (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "touch") {
        return;
      }
      setHovered(false);
      setTargets(
        revealed ? { targetRadius: 0 } : { targetProgress: 0, targetRadius: 0 }
      );
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "touch" || reveal === "dissolve") {
        return;
      }
      const { x, y } = pointIn(event);
      setTargets({ targetX: x, targetY: y });
    },
  };

  return { handlers, loop, open: hovered || revealed, reducedMotion };
};

/**
 * A dithered image that shows the original underneath on hover or focus.
 * With a mouse, a dithered spotlight follows the pointer; on touch, a tap
 * toggles the whole image. The original stays in the page as a real
 * `<img>` with your alt text.
 */
export const HoverReveal = ({
  src,
  alt,
  reveal = "spotlight",
  radius = 140,
  revealMatrix = "bayer8",
  method = "atkinson",
  palette = DEFAULT_PALETTE,
  cell = IMAGE_CELL,
  contrast = 1.2,
  brightness = 0,
  fit = "cover",
  tabIndex = 0,
  className,
  ...props
}: HoverRevealProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { frame, status } = useDitheredFrame(rootRef, {
    brightness,
    cell,
    contrast,
    fit,
    invert: false,
    method,
    palette,
    src,
  });
  const { handlers, loop, open, reducedMotion } = useReveal({
    canvasRef,
    frame,
    matrix: revealMatrix,
    radius,
    reveal,
    rootRef,
  });

  return (
    <div
      {...props}
      {...handlers}
      ref={rootRef}
      tabIndex={tabIndex}
      data-state={status === "ready" && !frame ? "loading" : status}
      data-revealed={open || undefined}
      data-loop={loop}
      className={cn(
        "relative isolate touch-manipulation overflow-hidden outline-none select-none",
        "focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2",
        className
      )}
    >
      {/* oxlint-disable-next-line next/no-img-element -- the original must load from any URL, unoptimised, so it lines up with the dither. */}
      <img
        src={src}
        alt={alt}
        aria-hidden={alt === "" ? true : undefined}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={cn(
          "absolute inset-0 -z-10 size-full",
          FIT_CLASS[fit],
          // Keep the original hidden until the dither covers it.
          !frame && status !== "error" && "opacity-0"
        )}
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn(
          CANVAS_CLASS,
          FADE_CLASS,
          frame && !(reducedMotion && open) ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
};
