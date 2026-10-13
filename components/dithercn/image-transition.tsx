"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps, CSSProperties, RefObject } from "react";

import {
  byLuminance,
  CANVAS_CLASS,
  FADE_CLASS,
  IMAGE_CELL,
  loadImage,
  renderDitheredImage,
  sizeCanvas,
  useDitherGrid,
  useSeen,
} from "@/components/dithercn/dither-image";
import type {
  DitherGrid,
  ImageFit,
  ToneOptions,
} from "@/components/dithercn/dither-image";
import {
  DEFAULT_PALETTE,
  thresholdAt,
  useDitherColors,
  useDocumentVisible,
  useFrameLoop,
  useInView,
  usePrefersReducedMotion,
} from "@/lib/dither";
import type { DitherMatrix, DitherMethod, DitherPalette } from "@/lib/dither";
import { cn } from "@/lib/utils";

export interface TransitionImage {
  src: string;
  /** Describes the image. Read out as the slide changes. */
  alt: string;
}

export type ImageTransitionProps = Omit<
  ComponentProps<"div">,
  "children" | "onPointerEnter" | "onPointerLeave"
> & {
  /** The images to move between, in order. */
  images: readonly [TransitionImage, ...TransitionImage[]];
  /**
   * The image to show. Pass it to control the component yourself; leave
   * it out to let it play on its own.
   */
  index?: number;
  /** Called with the next index whenever autoplay moves on. */
  onIndexChange?: (index: number) => void;
  /** Milliseconds each image stays when playing on its own. 0 stops. Default 5000. */
  interval?: number;
  /** Length of the dissolve in milliseconds. Default 1400. */
  duration?: number;
  /** Threshold pattern the dissolve follows. Default `"bayer8"`. */
  transitionMatrix?: DitherMatrix;
  /** Dither algorithm for the images. Default `"atkinson"`. */
  method?: DitherMethod;
  /** Two to four colours, darkest used for shadows. Default paper and ink. */
  palette?: DitherPalette;
  /** Size of one cell in CSS pixels. Default 2. */
  cell?: number;
  /** 1 leaves contrast alone. Default 1.2. */
  contrast?: number;
  /** Shifts every tone, from -1 to 1. Default 0. */
  brightness?: number;
  /** How each image fills the box, as in `object-fit`. Default `"cover"`. */
  fit?: ImageFit;
  /** Width over height. Default: the first image's ratio. */
  ratio?: number;
};

interface Dissolve {
  from: number;
  to: number;
  progress: number;
}

// How much the dissolve drifts from the top left to the bottom right, on
// top of the matrix order. 0 would be a pure ordered dissolve.
const SWEEP = 0.3;

const thresholdsFor = (grid: DitherGrid, matrix: DitherMatrix) => {
  const { columns, rows } = grid;
  const values = new Float32Array(columns * rows);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const sweep = 0.6 * (x / columns) + 0.4 * (y / rows);
      values[y * columns + x] =
        thresholdAt(matrix, x, y) * (1 - SWEEP) + sweep * SWEEP;
    }
  }
  return values;
};

/** Each cell shows `to` once `level` passes its threshold, else `from`. */
const composite = ({
  from,
  to,
  work,
  thresholds,
  level,
}: {
  from: ImageData;
  to: ImageData;
  work: ImageData;
  thresholds: Float32Array;
  level: number;
}) => {
  // Copy whole pixels at once through 32-bit views.
  const fromPixels = new Uint32Array(from.data.buffer);
  const toPixels = new Uint32Array(to.data.buffer);
  const out = new Uint32Array(work.data.buffer);
  for (let index = 0; index < out.length; index += 1) {
    out[index] =
      level > (thresholds[index] ?? 1)
        ? (toPixels[index] ?? 0)
        : (fromPixels[index] ?? 0);
  }
};

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

const wrap = (index: number, length: number) =>
  ((index % length) + length) % length;

/** Load every image once the element nears the viewport. */
const useImages = (sources: readonly string[], enabled: boolean) => {
  const [loaded, setLoaded] = useState<ReadonlyMap<string, HTMLImageElement>>(
    () => new Map()
  );
  const key = sources.join("\n");

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    const load = async (src: string) => {
      try {
        const image = await loadImage(src);
        if (!cancelled) {
          setLoaded((current) => new Map(current).set(src, image));
        }
      } catch {
        // A broken image stays blank; the others still play.
      }
    };
    for (const src of key.split("\n")) {
      load(src);
    }
    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  return loaded;
};

/** Dithered pixels for every loaded image, rebuilt when the grid, colours or options change. */
const useDitheredSet = ({
  rootRef,
  images,
  cell,
  palette,
  matrix,
  tone,
}: {
  rootRef: RefObject<HTMLDivElement | null>;
  images: readonly TransitionImage[];
  cell: number | undefined;
  palette: DitherPalette;
  matrix: DitherMatrix;
  tone: ToneOptions;
}) => {
  const seen = useSeen(rootRef);
  const grid = useDitherGrid(rootRef, cell);
  const colors = useDitherColors(rootRef, palette);
  const loaded = useImages(
    images.map((image) => image.src),
    seen
  );
  const framesRef = useRef(new Map<string, ImageData>());
  const thresholdsRef = useRef<Float32Array | null>(null);
  const workRef = useRef<ImageData | null>(null);
  const [version, setVersion] = useState(0);
  const { method, contrast, brightness, fit } = tone;

  useEffect(() => {
    framesRef.current = new Map();
    if (!(grid && colors)) {
      return;
    }
    const sorted = byLuminance(colors);
    for (const [src, image] of loaded) {
      const pixels = renderDitheredImage(image, grid, sorted, {
        brightness,
        contrast,
        fit,
        invert: false,
        method,
      });
      if (pixels) {
        framesRef.current.set(src, pixels);
      }
    }
    thresholdsRef.current = thresholdsFor(grid, matrix);
    workRef.current = new ImageData(grid.columns, grid.rows);
    setVersion((value) => value + 1);
  }, [grid, colors, loaded, method, contrast, brightness, fit, matrix]);

  return { framesRef, grid, loaded, thresholdsRef, version, workRef };
};

/**
 * Moves from the image on screen to `target` through a dissolve, painting
 * every frame while it runs and the resting image otherwise.
 */
const useDissolve = ({
  rootRef,
  canvasRef,
  images,
  target,
  duration,
  grid,
  version,
  framesRef,
  thresholdsRef,
  workRef,
}: {
  rootRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  images: readonly TransitionImage[];
  target: number;
  duration: number;
  grid: DitherGrid | null;
  version: number;
} & Pick<
  ReturnType<typeof useDitheredSet>,
  "framesRef" | "thresholdsRef" | "workRef"
>) => {
  const reducedMotion = usePrefersReducedMotion();
  const [shown, setShown] = useState(target);
  const dissolveRef = useRef<Dissolve | null>(null);
  const [moving, setMoving] = useState(false);

  const frameAt = (position: number) => {
    const image = images[position];
    return image ? framesRef.current.get(image.src) : undefined;
  };

  const paint = () => {
    const context = canvasRef.current?.getContext("2d");
    const work = workRef.current;
    const thresholds = thresholdsRef.current;
    const dissolve = dissolveRef.current;
    const from = frameAt(dissolve ? dissolve.from : shown);
    const to = dissolve ? frameAt(dissolve.to) : from;
    if (!(context && work && thresholds && from && to)) {
      return;
    }
    if (dissolve) {
      composite({
        from,
        level: easeInOut(dissolve.progress),
        thresholds,
        to,
        work,
      });
      context.putImageData(work, 0, 0);
    } else {
      context.putImageData(from, 0, 0);
    }
  };

  // Start a dissolve whenever the target changes.
  useEffect(() => {
    if (target === shown) {
      return;
    }
    if (reducedMotion || !frameAt(shown)) {
      dissolveRef.current = null;
      setShown(target);
      return;
    }
    const { current } = dissolveRef;
    // Interrupted mid-way: carry on from whichever image covers more.
    const from =
      current && current.progress > 0.5 ? current.to : (current?.from ?? shown);
    dissolveRef.current = { from, progress: 0, to: target };
    setMoving(true);
    // `frameAt` reads a ref; `shown` is set by this effect and the loop.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reducedMotion]);

  const loop = useFrameLoop(
    (_time, delta) => {
      const dissolve = dissolveRef.current;
      if (!dissolve) {
        return;
      }
      dissolve.progress = Math.min(
        1,
        dissolve.progress + (delta * 1000) / Math.max(1, duration)
      );
      if (dissolve.progress >= 1) {
        dissolveRef.current = null;
        setShown(dissolve.to);
        setMoving(false);
        return;
      }
      paint();
    },
    { enabled: moving && !reducedMotion, fps: 60, target: rootRef }
  );

  // Redraw the resting image when it or the pixels change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!(canvas && grid)) {
      return;
    }
    sizeCanvas(canvas, grid);
    paint();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [version, shown, grid]);

  return { loop, moving, shown };
};

/** Calls `onAdvance` with the next index every `interval` while enabled. */
const useAutoplay = ({
  enabled,
  interval,
  count,
  shown,
  onAdvance,
}: {
  enabled: boolean;
  interval: number;
  count: number;
  shown: number;
  onAdvance: (next: number) => void;
}) => {
  const advanceRef = useRef(onAdvance);
  useEffect(() => {
    advanceRef.current = onAdvance;
  });
  const playing = enabled && interval > 0 && count > 1;
  useEffect(() => {
    if (!playing) {
      return;
    }
    const timer = window.setTimeout(
      () => advanceRef.current(wrap(shown + 1, count)),
      interval
    );
    return () => window.clearTimeout(timer);
  }, [playing, shown, count, interval]);
};

/** The `ratio` prop if set, else the image's own ratio once it loads. */
const ratioOf = (
  ratio: number | undefined,
  image: HTMLImageElement | undefined
) => ratio ?? (image ? image.naturalWidth / image.naturalHeight : undefined);

const stateOf = (ready: boolean, moving: boolean) => {
  if (!ready) {
    return "loading";
  }
  return moving ? "dissolving" : "ready";
};

/**
 * Two or more images that dissolve into each other through a dither
 * threshold pattern. It plays on its own, pausing on hover, when
 * offscreen and in hidden tabs, or follows an `index` you control. With
 * reduced motion, images switch without the dissolve.
 */
export const ImageTransition = ({
  images,
  index,
  onIndexChange,
  interval = 5000,
  duration = 1400,
  transitionMatrix = "bayer8",
  method = "atkinson",
  palette = DEFAULT_PALETTE,
  cell = IMAGE_CELL,
  contrast = 1.2,
  brightness = 0,
  fit = "cover",
  ratio,
  className,
  style,
  ...props
}: ImageTransitionProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visible = useDocumentVisible();
  const inView = useInView(rootRef);
  const { framesRef, grid, loaded, thresholdsRef, version, workRef } =
    useDitheredSet({
      cell,
      images,
      matrix: transitionMatrix,
      palette,
      rootRef,
      tone: { brightness, contrast, fit, invert: false, method },
    });

  const count = images.length;
  const [ownIndex, setOwnIndex] = useState(0);
  const target = wrap(index ?? ownIndex, count);
  const [paused, setPaused] = useState(false);
  const { loop, moving, shown } = useDissolve({
    canvasRef,
    duration,
    framesRef,
    grid,
    images,
    rootRef,
    target,
    thresholdsRef,
    version,
    workRef,
  });

  useAutoplay({
    count,
    enabled: index === undefined && !(paused || moving) && inView && visible,
    interval,
    onAdvance: (next) => {
      setOwnIndex(next);
      onIndexChange?.(next);
    },
    shown,
  });

  const [{ src: firstSrc }] = images;
  const rootStyle: CSSProperties = {
    aspectRatio: ratioOf(ratio, loaded.get(firstSrc)),
    ...style,
  };
  const ready = version > 0 && loaded.has(images[shown]?.src ?? "");
  const state = stateOf(ready, moving);

  return (
    <div
      {...props}
      ref={rootRef}
      role="img"
      aria-label={images[target]?.alt}
      data-state={state}
      data-index={target}
      data-loop={loop}
      className={cn("relative overflow-hidden", className)}
      style={rootStyle}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") {
          setPaused(true);
        }
      }}
      onPointerLeave={() => setPaused(false)}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn(
          CANVAS_CLASS,
          FADE_CLASS,
          ready ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
};
