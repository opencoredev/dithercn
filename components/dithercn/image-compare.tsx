"use client";

import { memo, useEffect, useRef, useState } from "react";
import type {
  ComponentProps,
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  RefObject,
} from "react";

import {
  DitherImage,
  useLoadedImage,
  useSeen,
} from "@/components/dithercn/dither-image";
import type { DitherLook, ImageFit } from "@/components/dithercn/dither-image";
import { useInView, usePrefersReducedMotion } from "@/lib/dither";
import { cn } from "@/lib/utils";

/** One side of the comparison: the photo as it is, or dithered. */
export type CompareSide =
  | { kind: "original" }
  | ({ kind: "dither" } & Omit<DitherLook, "fit">);

export type ImageCompareProps = Omit<
  ComponentProps<"div">,
  "children" | "defaultValue" | "onChange"
> & {
  /** Image URL. Cross-origin images need CORS headers. */
  src: string;
  /** Describes the image. */
  alt: string;
  /** The left side. Default `{ kind: "dither" }`. */
  before?: CompareSide;
  /** The right side. Default `{ kind: "original" }`. */
  after?: CompareSide;
  /** Label on the left side. Default from the side: "Dithered" or "Original". */
  beforeLabel?: string;
  /** Label on the right side. */
  afterLabel?: string;
  /** Show the corner labels. Default `true`. */
  labels?: boolean;
  /** Divider position from the left, 0 to 100. Makes the slider controlled. */
  value?: number;
  /** Starting position when uncontrolled. Default 50. */
  defaultValue?: number;
  /** Called with the new position while dragging or on key presses. */
  onValueChange?: (value: number) => void;
  /**
   * Nudge the divider once when the image first comes into view, so it
   * reads as draggable. Off under reduced motion. Default `true`.
   */
  hint?: boolean;
  /** Width over height. Default: the image's own ratio. */
  ratio?: number;
  /** How the image fills its box. Default `"cover"`. */
  fit?: ImageFit;
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const labelOf = (side: CompareSide) =>
  side.kind === "original" ? "Original" : "Dithered";

// The divider sweeps to each stop, then settles back to the start.
const HINT_STOPS = [-14, 10, 0] as const;
const HINT_STEP = 520;

/** How far each key moves the divider, in percent. */
const keyStep = (event: KeyboardEvent, value: number): number | null => {
  const step = event.shiftKey ? 10 : 1;
  switch (event.key) {
    case "ArrowLeft":
    case "ArrowDown": {
      return value - step;
    }
    case "ArrowRight":
    case "ArrowUp": {
      return value + step;
    }
    case "PageDown": {
      return value - 10;
    }
    case "PageUp": {
      return value + 10;
    }
    case "Home": {
      return 0;
    }
    case "End": {
      return 100;
    }
    default: {
      return null;
    }
  }
};

const SideLayer = memo(
  ({ side, src, fit }: { side: CompareSide; src: string; fit: ImageFit }) => {
    if (side.kind === "original") {
      return (
        // A plain img: the comparison is meant to show the untouched file.
        // oxlint-disable-next-line nextjs/no-img-element
        <img
          src={src}
          alt=""
          draggable={false}
          decoding="async"
          className="absolute inset-0 size-full select-none"
          style={{ objectFit: fit }}
        />
      );
    }
    const { kind: _kind, ...look } = side;
    return (
      <DitherImage
        {...look}
        src={src}
        alt=""
        fit={fit}
        className="absolute inset-0 size-full"
      />
    );
  }
);
SideLayer.displayName = "SideLayer";

/** A column of pixel dots: the grip reads as part of the dither. */
const GRIP_DOTS = [0, 1, 2, 3, 4].flatMap((row) =>
  [0, 1].map((column) => ({ column, row }))
);

const Grip = () => (
  <svg
    aria-hidden
    viewBox="0 0 5 14"
    className="h-3.5 w-[5px]"
    shapeRendering="crispEdges"
  >
    {GRIP_DOTS.map(({ column, row }) => (
      <rect
        key={`${column}-${row}`}
        x={column * 3}
        y={row * 3}
        width={2}
        height={2}
        fill="currentColor"
      />
    ))}
  </svg>
);

const Arrow = ({ side }: { side: "left" | "right" }) => (
  <svg
    aria-hidden
    viewBox="0 0 4 7"
    className={cn(
      "h-[7px] w-1 text-white opacity-0 transition-[opacity,transform] duration-200 ease-(--ease-out) group-hover/compare:opacity-90 group-data-[dragging]/compare:opacity-0 motion-reduce:transition-none",
      side === "left"
        ? "group-hover/compare:-translate-x-0.5"
        : "group-hover/compare:translate-x-0.5"
    )}
    shapeRendering="crispEdges"
  >
    <path
      d={
        side === "left"
          ? "M3 0h1v7h-1zM2 1h1v5h-1zM1 2h1v3h-1zM0 3h1v1h-1z"
          : "M0 0h1v7h-1zM1 1h1v5h-1zM2 2h1v3h-1zM3 3h1v1h-1z"
      }
      fill="currentColor"
    />
  </svg>
);

const CornerLabel = ({
  side,
  hidden,
  children,
}: {
  side: "left" | "right";
  hidden: boolean;
  children: string;
}) => (
  <span
    aria-hidden
    className={cn(
      "pointer-events-none absolute top-3 rounded-md bg-black/55 px-2 py-1 font-mono text-[10px] tracking-[0.12em] text-white uppercase backdrop-blur-sm transition-opacity duration-200 ease-(--ease-out) motion-reduce:transition-none",
      side === "left" ? "left-3" : "right-3",
      hidden ? "opacity-0" : "opacity-100"
    )}
  >
    {children}
  </span>
);

/** Uncontrolled position with an optional controlled override. */
const usePosition = ({
  value,
  defaultValue,
  onValueChange,
}: {
  value: number | undefined;
  defaultValue: number;
  onValueChange: ((value: number) => void) | undefined;
}) => {
  const [inner, setInner] = useState(() => clampPercent(defaultValue));
  const position = value === undefined ? inner : clampPercent(value);
  const set = (next: number) => {
    const clamped = Math.round(clampPercent(next) * 10) / 10;
    if (value === undefined) {
      setInner(clamped);
    }
    onValueChange?.(clamped);
  };
  return [position, set] as const;
};

/** The one-time nudge that shows the divider moves. */
const useHint = ({
  enabled,
  rootRef,
  start,
  setPosition,
}: {
  enabled: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
  start: number;
  setPosition: (value: number) => void;
}) => {
  const inView = useInView(rootRef, { rootMargin: "-25% 0px" });
  const [phase, setPhase] = useState<"waiting" | "running" | "done">("waiting");

  useEffect(() => {
    if (!(enabled && inView && phase === "waiting")) {
      return;
    }
    setPhase("running");
  }, [enabled, inView, phase]);

  useEffect(() => {
    if (phase !== "running") {
      return;
    }
    const timers = HINT_STOPS.map((offset, index) =>
      window.setTimeout(
        () => {
          setPosition(start + offset);
          if (index === HINT_STOPS.length - 1) {
            window.setTimeout(() => setPhase("done"), HINT_STEP);
          }
        },
        index * HINT_STEP + 120
      )
    );
    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
    // The nudge runs once from where the divider started.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return {
    hinting: phase === "running",
    stop: () => setPhase("done"),
  };
};

/** Pointer dragging and keyboard steps for the divider. */
const useDrag = ({
  rootRef,
  position,
  setPosition,
  stop,
}: {
  rootRef: RefObject<HTMLDivElement | null>;
  position: number;
  setPosition: (value: number) => void;
  stop: () => void;
}) => {
  const [dragging, setDragging] = useState(false);
  const [glide, setGlide] = useState(true);

  const positionAt = (clientX: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      return position;
    }
    return ((clientX - rect.left) / rect.width) * 100;
  };

  const endDrag = () => {
    setDragging(false);
    setGlide(true);
  };

  const handlers = {
    onPointerCancel: endDrag,
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }
      stop();
      event.currentTarget.setPointerCapture(event.pointerId);
      // A click glides to the spot; the drag that follows tracks exactly.
      setGlide(true);
      setPosition(positionAt(event.clientX));
      setDragging(true);
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (!dragging) {
        return;
      }
      setGlide(false);
      setPosition(positionAt(event.clientX));
    },
    onPointerUp: endDrag,
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = keyStep(event, position);
    if (next === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    stop();
    setGlide(false);
    setPosition(next);
  };

  return { dragging, glide, handlers, onKeyDown };
};

/** Clicks and the hint glide; drags and keys track exactly. */
const motionClass = ({
  glide,
  dragging,
  hinting,
}: {
  glide: boolean;
  dragging: boolean;
  hinting: boolean;
}) =>
  glide && !dragging
    ? cn(
        "transition-[clip-path,transform] ease-(--ease-out) motion-reduce:transition-none",
        hinting ? "duration-500" : "duration-200"
      )
    : undefined;

/** The line and the handle, which is the focusable slider. */
const Divider = ({
  motion,
  position,
  leftLabel,
  rightLabel,
  onKeyDown,
}: {
  motion: string | undefined;
  position: number;
  leftLabel: string;
  rightLabel: string;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}) => (
  <>
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", motion)}
      style={{ transform: "translateX(var(--compare))" }}
    >
      <div className="absolute inset-y-0 -left-px w-0.5 bg-white/90 shadow-[0_0_0_1px_rgb(0_0_0/0.25)] transition-[width,margin] duration-150 ease-(--ease-out) group-data-[dragging]/compare:-ml-px group-data-[dragging]/compare:w-1 motion-reduce:transition-none" />
    </div>

    <div
      className={cn("pointer-events-none absolute inset-0", motion)}
      style={{ transform: "translateX(var(--compare))" }}
    >
      <div className="absolute top-1/2 left-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5">
        <Arrow side="left" />
        <div
          role="slider"
          tabIndex={0}
          aria-label={`${leftLabel} and ${rightLabel} divider`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
          aria-valuetext={`${Math.round(position)}% ${leftLabel.toLowerCase()}`}
          aria-orientation="horizontal"
          onKeyDown={onKeyDown}
          className="pointer-events-auto relative flex h-11 w-7 cursor-grab items-center justify-center rounded-[10px] border border-black/10 bg-white text-neutral-900 shadow-[0_1px_2px_rgb(0_0_0/0.3),0_6px_20px_-4px_rgb(0_0_0/0.45)] transition-transform duration-150 ease-(--ease-out) outline-none group-data-[dragging]/compare:scale-95 group-data-[dragging]/compare:cursor-grabbing focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black motion-reduce:transition-none"
        >
          <Grip />
        </div>
        <Arrow side="right" />
      </div>
    </div>
  </>
);

/**
 * A before/after slider over one image: drag the divider, click anywhere,
 * or focus the handle and use the arrow keys. By default the left side is
 * dithered and the right is the original photo; either side can be any
 * dither look.
 */
export const ImageCompare = ({
  src,
  alt,
  before = { kind: "dither" },
  after = { kind: "original" },
  beforeLabel,
  afterLabel,
  labels = true,
  value,
  defaultValue = 50,
  onValueChange,
  hint = true,
  ratio,
  fit = "cover",
  className,
  style,
  ...props
}: ImageCompareProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const seen = useSeen(rootRef);
  const { image } = useLoadedImage(src, seen);
  const [position, setPosition] = usePosition({
    defaultValue,
    onValueChange,
    value,
  });
  const { hinting, stop } = useHint({
    enabled: hint && !reducedMotion && value === undefined,
    rootRef,
    setPosition,
    start: position,
  });
  const { dragging, glide, handlers, onKeyDown } = useDrag({
    position,
    rootRef,
    setPosition,
    stop,
  });

  const leftLabel = beforeLabel ?? labelOf(before);
  const rightLabel = afterLabel ?? labelOf(after);

  const naturalRatio = image ? image.naturalWidth / image.naturalHeight : null;
  const rootStyle: CSSProperties & Record<"--compare", string> = {
    "--compare": `${position}%`,
    aspectRatio: ratio ?? naturalRatio ?? 4 / 3,
    ...style,
  };
  const motion = motionClass({ dragging, glide, hinting });

  return (
    <div
      {...props}
      ref={rootRef}
      role="group"
      aria-roledescription="image comparison"
      aria-label={alt}
      data-dragging={dragging || undefined}
      className={cn(
        "group/compare relative isolate cursor-ew-resize touch-pan-y overflow-hidden select-none",
        className
      )}
      style={rootStyle}
      {...handlers}
    >
      <SideLayer side={after} src={src} fit={fit} />
      <div
        className={cn("absolute inset-0", motion)}
        style={{ clipPath: "inset(0 calc(100% - var(--compare)) 0 0)" }}
      >
        <SideLayer side={before} src={src} fit={fit} />
      </div>

      {labels && (
        <>
          <CornerLabel side="left" hidden={position < 18}>
            {leftLabel}
          </CornerLabel>
          <CornerLabel side="right" hidden={position > 82}>
            {rightLabel}
          </CornerLabel>
        </>
      )}

      <Divider
        motion={motion}
        position={position}
        leftLabel={leftLabel}
        rightLabel={rightLabel}
        onKeyDown={onKeyDown}
      />
    </div>
  );
};
