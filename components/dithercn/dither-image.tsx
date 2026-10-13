"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps, CSSProperties, RefObject } from "react";

import {
  DEFAULT_PALETTE,
  ditherImage,
  readDitherCell,
  useDitherColors,
  useInView,
} from "@/lib/dither";
import type { DitherMethod, DitherPalette, Rgba } from "@/lib/dither";
import { cn } from "@/lib/utils";

/**
 * The cell grid an image is dithered on. One cell is `scale` device
 * pixels, so cells stay crisp and even at any zoom. The canvas is
 * `width` x `height` CSS pixels, which can overshoot its box by less
 * than one cell.
 */
export interface DitherGrid {
  readonly columns: number;
  readonly rows: number;
  readonly scale: number;
  readonly width: number;
  readonly height: number;
}

export type ImageFit = "cover" | "contain";

/**
 * Default cell for photos, in CSS pixels. Finer than the site's
 * `--dither-cell`, because photos need the detail.
 */
export const IMAGE_CELL = 2;

/** How a photo's tones become palette colours. */
export interface ToneOptions {
  method: DitherMethod;
  /** 1 leaves contrast alone; higher values push tones apart. */
  contrast: number;
  /** Added to every tone, from -1 to 1. */
  brightness: number;
  /** Swap light and dark. */
  invert: boolean;
  fit: ImageFit;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

/**
 * Load and decode an image once per URL. Cross-origin images need CORS
 * headers, as the pixels are read back from a canvas.
 */
const decode = async (src: string) => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  image.src = src;
  try {
    await image.decode();
    return image;
  } catch (error) {
    // Let a later call try again.
    imageCache.delete(src);
    throw error;
  }
};

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  const cached = imageCache.get(src);
  if (cached) {
    return cached;
  }
  const promise = decode(src);
  imageCache.set(src, promise);
  return promise;
};

/**
 * Load an image when `enabled` turns true (usually when its box nears the
 * viewport). `status` is `"idle"` until then.
 */
export const useLoadedImage = (src: string, enabled: boolean) => {
  const [result, setResult] = useState<{
    src: string;
    image: HTMLImageElement | null;
  } | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      let image: HTMLImageElement | null = null;
      try {
        image = await loadImage(src);
      } catch {
        image = null;
      }
      if (!cancelled) {
        setResult({ image, src });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [src, enabled]);

  if (!enabled || result?.src !== src) {
    return { image: null, status: enabled ? "loading" : "idle" } as const;
  }
  return result.image
    ? ({ image: result.image, status: "ready" } as const)
    : ({ image: null, status: "error" } as const);
};

/** `true` once the element has come within `rootMargin` of the viewport. */
export const useSeen = (
  ref: RefObject<Element | null>,
  rootMargin = "320px"
) => {
  const inView = useInView(ref, { rootMargin });
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (inView) {
      setSeen(true);
    }
  }, [inView]);
  return seen || inView;
};

const gridFor = (width: number, height: number, cell: number): DitherGrid => {
  const ratio = window.devicePixelRatio || 1;
  const scale = Math.max(1, Math.round(cell * ratio));
  const columns = Math.max(1, Math.ceil((width * ratio) / scale));
  const rows = Math.max(1, Math.ceil((height * ratio) / scale));
  return {
    columns,
    height: (rows * scale) / ratio,
    rows,
    scale,
    width: (columns * scale) / ratio,
  };
};

const sameGrid = (a: DitherGrid | null, b: DitherGrid) =>
  a !== null &&
  a.columns === b.columns &&
  a.rows === b.rows &&
  a.scale === b.scale;

/**
 * The cell grid for the element's current size, updated on resize and
 * zoom. `cell` is in CSS pixels; omit it to read `--dither-cell`.
 */
export const useDitherGrid = (
  ref: RefObject<HTMLElement | null>,
  cell?: number
): DitherGrid | null => {
  const [grid, setGrid] = useState<DitherGrid | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width < 1 || height < 1) {
        return;
      }
      const next = gridFor(width, height, cell ?? readDitherCell(el));
      setGrid((current) => (sameGrid(current, next) ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, cell]);

  return grid;
};

const makeCanvas = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

/** Where the image lands in a `columns` x `rows` box, as object-fit does. */
const fitRect = (
  image: HTMLImageElement,
  columns: number,
  rows: number,
  fit: ImageFit
) => {
  const scaleX = columns / image.naturalWidth;
  const scaleY = rows / image.naturalHeight;
  const scale =
    fit === "cover" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  return {
    height,
    width,
    x: (columns - width) / 2,
    y: (rows - height) / 2,
  };
};

/**
 * Draw `image` into a `columns` x `rows` buffer, one pixel per cell.
 * Large downscales halve in steps first, which keeps fine detail from
 * aliasing into noise.
 */
export const rasterize = (
  image: HTMLImageElement,
  columns: number,
  rows: number,
  fit: ImageFit
): ImageData | null => {
  const rect = fitRect(image, columns, rows, fit);
  let source: CanvasImageSource = image;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  while (sourceWidth / 2 > rect.width && sourceHeight / 2 > rect.height) {
    const half = makeCanvas(
      Math.ceil(sourceWidth / 2),
      Math.ceil(sourceHeight / 2)
    );
    const context = half.getContext("2d");
    if (!context) {
      break;
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, half.width, half.height);
    source = half;
    sourceWidth = half.width;
    sourceHeight = half.height;
  }

  const canvas = makeCanvas(columns, rows);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(source, rect.x, rect.y, rect.width, rect.height);
  return context.getImageData(0, 0, columns, rows);
};

const luminance = (color: Rgba) =>
  0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2];

/**
 * Palette colours from darkest to lightest, so dark parts of a photo take
 * the darkest colour in both light and dark themes.
 */
export const byLuminance = (colors: readonly Rgba[]): Rgba[] =>
  colors.toSorted((a, b) => luminance(a) - luminance(b));

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Dither a rasterised image to `colors` (darkest first). Works in tone
 * only: the photo becomes grey, the grey is dithered to as many steps as
 * there are colours, and each step takes its colour.
 */
export const ditherPixels = (
  pixels: ImageData,
  colors: readonly Rgba[],
  { method, contrast, brightness, invert }: Omit<ToneOptions, "fit">
): ImageData => {
  const { data, width, height } = pixels;
  const steps = Math.max(2, colors.length);
  const tones = new Uint8ClampedArray(data.length);
  for (let offset = 0; offset < data.length; offset += 4) {
    const alpha = (data[offset + 3] ?? 0) / 255;
    const light =
      (0.2126 * (data[offset] ?? 0) +
        0.7152 * (data[offset + 1] ?? 0) +
        0.0722 * (data[offset + 2] ?? 0)) /
      255;
    const tone = clamp01((light - 0.5) * contrast + 0.5 + brightness);
    const value = (invert ? 1 - tone : tone) * 255;
    tones[offset] = value;
    tones[offset + 1] = value;
    tones[offset + 2] = value;
    tones[offset + 3] = alpha * 255;
  }

  const greys = Array.from({ length: steps }, (_, index) => {
    const grey = index / (steps - 1);
    return [grey, grey, grey] as const;
  });
  const [first = [0, 0, 0] as const, second = [1, 1, 1] as const, ...rest] =
    greys;
  const result = ditherImage(
    { data: tones, height, width },
    { method, palette: [first, second, ...rest] }
  );

  const out = result.data;
  for (let offset = 0; offset < out.length; offset += 4) {
    const step = Math.round(((out[offset] ?? 0) / 255) * (steps - 1));
    const color = colors[step] ?? colors[0];
    if (!color) {
      continue;
    }
    out[offset] = color[0] * 255;
    out[offset + 1] = color[1] * 255;
    out[offset + 2] = color[2] * 255;
    out[offset + 3] = color[3] * (out[offset + 3] ?? 0);
  }
  return result;
};

/** Rasterise and dither in one go. */
export const renderDitheredImage = (
  image: HTMLImageElement,
  grid: DitherGrid,
  colors: readonly Rgba[],
  { fit, ...tone }: ToneOptions
): ImageData | null => {
  const pixels = rasterize(image, grid.columns, grid.rows, fit);
  return pixels ? ditherPixels(pixels, colors, tone) : null;
};

/** Size a canvas to the grid: one canvas pixel per cell, scaled up crisp. */
export const sizeCanvas = (canvas: HTMLCanvasElement, grid: DitherGrid) => {
  if (canvas.width !== grid.columns || canvas.height !== grid.rows) {
    canvas.width = grid.columns;
    canvas.height = grid.rows;
  }
  canvas.style.width = `${grid.width}px`;
  canvas.style.height = `${grid.height}px`;
};

export const CANVAS_CLASS =
  "pointer-events-none absolute top-0 left-0 max-w-none [image-rendering:pixelated]";

/** Fades a canvas in once its first frame is drawn. */
export const FADE_CLASS =
  "transition-opacity duration-400 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none";

export interface DitheredFrameOptions extends ToneOptions {
  src: string;
  palette: DitherPalette;
  cell?: number;
}

/**
 * Everything a component needs to show one dithered image: lazy loading,
 * the cell grid, theme colours and the dithered pixels, recomputed when
 * any of them change.
 */
export const useDitheredFrame = (
  ref: RefObject<HTMLElement | null>,
  {
    src,
    palette,
    cell,
    method,
    contrast,
    brightness,
    invert,
    fit,
  }: DitheredFrameOptions
) => {
  const seen = useSeen(ref);
  const { image, status } = useLoadedImage(src, seen);
  const grid = useDitherGrid(ref, cell);
  const colors = useDitherColors(ref, palette);
  const [frame, setFrame] = useState<{
    pixels: ImageData;
    grid: DitherGrid;
  } | null>(null);

  useEffect(() => {
    if (!(image && grid && colors)) {
      return;
    }
    const pixels = renderDitheredImage(image, grid, byLuminance(colors), {
      brightness,
      contrast,
      fit,
      invert,
      method,
    });
    if (pixels) {
      setFrame({ grid, pixels });
    }
  }, [image, grid, colors, method, contrast, brightness, invert, fit]);

  return { frame, image, status };
};

export type DitherImageProps = Omit<ComponentProps<"div">, "children"> & {
  /** Image URL. Cross-origin images need CORS headers. */
  src: string;
  /** Describes the image. Pass `""` for a decorative image. */
  alt: string;
  /** Dither algorithm. Default `"atkinson"`. */
  method?: DitherMethod;
  /**
   * Two to four colours. Dark parts of the image take the darkest one, so
   * the picture stays positive in light and dark themes. Default paper
   * and ink.
   */
  palette?: DitherPalette;
  /** Size of one cell in CSS pixels. Default 2. */
  cell?: number;
  /** 1 leaves contrast alone. Default 1.2. */
  contrast?: number;
  /** Shifts every tone, from -1 to 1. Default 0. */
  brightness?: number;
  /** Swap light and dark. Default `false`. */
  invert?: boolean;
  /** How the image fills its box, as in `object-fit`. Default `"cover"`. */
  fit?: ImageFit;
  /**
   * Width over height. Default: the image's own ratio, once it loads. A
   * height set in `className` wins.
   */
  ratio?: number;
};

/**
 * Any image, dithered to your palette on the CPU. It loads when it nears
 * the viewport, redraws on resize and theme change, and keeps its alt
 * text for assistive technology.
 */
export const DitherImage = ({
  src,
  alt,
  method = "atkinson",
  palette = DEFAULT_PALETTE,
  cell = IMAGE_CELL,
  contrast = 1.2,
  brightness = 0,
  invert = false,
  fit = "cover",
  ratio,
  className,
  style,
  ...props
}: DitherImageProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { frame, image, status } = useDitheredFrame(rootRef, {
    brightness,
    cell,
    contrast,
    fit,
    invert,
    method,
    palette,
    src,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!(canvas && frame)) {
      return;
    }
    sizeCanvas(canvas, frame.grid);
    canvas.getContext("2d")?.putImageData(frame.pixels, 0, 0);
  }, [frame]);

  const naturalRatio = image ? image.naturalWidth / image.naturalHeight : null;
  const aspectRatio = ratio ?? naturalRatio ?? undefined;
  const rootStyle: CSSProperties = { aspectRatio, ...style };
  const state = status === "ready" && !frame ? "loading" : status;
  const decorative = alt === "";

  return (
    <div
      {...props}
      ref={rootRef}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative ? true : undefined}
      data-state={state}
      className={cn("relative overflow-hidden", className)}
      style={rootStyle}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn(
          CANVAS_CLASS,
          FADE_CLASS,
          frame ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
};
