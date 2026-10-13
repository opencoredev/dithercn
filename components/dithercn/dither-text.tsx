"use client";

import { useCallback, useEffect, useRef } from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import {
  cssColor,
  ditherMaskStyle,
  getThresholdMap,
  readDitherCell,
  useDitherColors,
  useFrameLoop,
} from "@/lib/dither";
import type { DitherMatrix, DitherPalette, Rgba } from "@/lib/dither";
import { cn } from "@/lib/utils";

interface GradientFill {
  fill?: "gradient";
  /** Direction in degrees, as in CSS: 0 points up, 180 down. Default 180. */
  angle?: number;
  scale?: never;
}

interface NoiseFill {
  fill: "noise";
  /** Size of the noise blobs: higher values give smaller blobs. Default 3. */
  scale?: number;
  angle?: never;
}

export type DitherTextFill = GradientFill | NoiseFill;

export type DitherTextTag =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "p"
  | "span"
  | "div"
  | "strong";

export type DitherTextProps = Omit<HTMLAttributes<HTMLElement>, "children"> &
  DitherTextFill & {
    /** The text. It stays real, selectable text. */
    children: ReactNode;
    /** The element to render. Default `"span"`. */
    as?: DitherTextTag;
    /** Tone at the start of the fill, 0 (no ink) to 1 (solid). Default 1. */
    from?: number;
    /** Tone at the end of the fill. Default 0.4. */
    to?: number;
    /**
     * Colours from the lightest tone to the darkest. The first is usually
     * `"transparent"` so the page shows through the gaps.
     * Default `["transparent", "--dither-ink"]`.
     */
    palette?: DitherPalette;
    /** Threshold matrix. Default `"bayer4"`. */
    matrix?: DitherMatrix;
    /**
     * Cell size in CSS pixels. Default: about 1/24 of the font size, at
     * least 2, so hero and section sizes both read well.
     */
    cell?: number;
    /** Slowly shift the fill. Default `true`. */
    animate?: boolean;
    /** How fast the fill shifts. Default 1. */
    speed?: number;
  };

const DEFAULT_TEXT_PALETTE = [
  "transparent",
  "--dither-ink",
] as const satisfies DitherPalette;

// Value noise and fbm on the CPU, matching the shader helpers in spirit.
// The grid is small (one sample per dither cell), so this stays cheap.
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43_758.545_312_3;
  return s - Math.floor(s);
};

const smooth = (t: number) => t * t * (3 - 2 * t);

const valueNoise = (x: number, y: number) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};

const fbm = (x: number, y: number) =>
  valueNoise(x, y) * 0.5333 +
  valueNoise(x * 2.03 + 17.1, y * 2.03 + 9.2) * 0.2667 +
  valueNoise(x * 4.01 + 3.7, y * 4.01 + 31.4) * 0.1333 +
  valueNoise(x * 8.05 + 41.3, y * 8.05 + 5.9) * 0.0667;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

interface FieldOptions {
  fill: "gradient" | "noise";
  angle: number;
  scale: number;
  from: number;
  to: number;
}

/** Tone 0..1 at a cell centre. `u`, `v` are 0..1 across the box, `aspect` w/h. */
const toneAt = (
  { fill, angle, scale, from, to }: FieldOptions,
  u: number,
  v: number,
  aspect: number,
  time: number
) => {
  const px = (u - 0.5) * aspect;
  const py = v - 0.5;
  if (fill === "noise") {
    const n = fbm(px * scale + time * 0.09, py * scale - time * 0.05);
    return from + (to - from) * clamp01((n - 0.22) / 0.56);
  }
  const a = (angle * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const extent = Math.abs(dx) * aspect * 0.5 + Math.abs(dy) * 0.5;
  const drift = fbm(px * 1.6 + time * 0.07, py * 1.6 - time * 0.04) - 0.5;
  const s = clamp01((px * dx + py * dy) / (2 * extent) + 0.5 + drift * 0.28);
  return from + (to - from) * s;
};

const toByte = (value: number) => Math.round(value * 255);

/**
 * Display text whose letters are filled with a dither. The text stays a
 * real element (selectable, read by screen readers, indexed); the dither
 * is a small generated image clipped to the glyphs with
 * `background-clip: text`.
 */
export const DitherText = (props: DitherTextProps) => {
  const {
    as: Tag = "span",
    children,
    from = 1,
    to = 0.4,
    palette = DEFAULT_TEXT_PALETTE,
    matrix = "bayer4",
    cell,
    animate = true,
    speed = 1,
    fill: _fill,
    angle: _angle,
    scale: _scale,
    className,
    style,
    ...rest
  } = props;
  const fill = props.fill ?? "gradient";
  const angle = props.fill === "noise" ? 0 : (props.angle ?? 180);
  const scale = props.fill === "noise" ? (props.scale ?? 3) : 1;

  const ref = useRef<HTMLElement>(null);
  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef({ cell: 3, height: 0, width: 0 });
  const timeRef = useRef(0);
  const colors = useDitherColors(ref, palette);

  // Paint one frame into a cell-sized canvas and set it as the background.
  const draw = useCallback(
    (time: number) => {
      const el = ref.current;
      const { width, height, cell: size } = sizeRef.current;
      if (!el || !colors || width === 0 || height === 0) {
        return;
      }
      const cols = Math.ceil(width / size);
      const rows = Math.ceil(height / size);
      canvasRef.current ??= document.createElement("canvas");
      const canvas = canvasRef.current;
      if (canvas.width !== cols || canvas.height !== rows) {
        canvas.width = cols;
        canvas.height = rows;
      }
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }
      const image = context.createImageData(cols, rows);
      const { data } = image;
      const { size: tile, thresholds } = getThresholdMap(matrix);
      const segments = colors.length - 1;
      const aspect = width / height;
      const field: FieldOptions = { angle, fill, from, scale, to };
      for (let y = 0; y < rows; y += 1) {
        const v = (y + 0.5) / rows;
        for (let x = 0; x < cols; x += 1) {
          const tone = toneAt(field, (x + 0.5) / cols, v, aspect, time);
          const scaled = clamp01(tone) * segments;
          const low = Math.min(segments - 1, Math.floor(scaled));
          const threshold = thresholds[(y % tile) * tile + (x % tile)] ?? 0.5;
          const pick: Rgba | undefined =
            scaled - low > threshold ? colors[low + 1] : colors[low];
          const [r, g, b, alpha] = pick ?? [0, 0, 0, 0];
          const offset = (y * cols + x) * 4;
          data[offset] = toByte(r);
          data[offset + 1] = toByte(g);
          data[offset + 2] = toByte(b);
          data[offset + 3] = toByte(alpha);
        }
      }
      context.putImageData(image, 0, 0);
      el.style.backgroundImage = `url(${canvas.toDataURL()})`;
      el.style.backgroundSize = `${cols * size}px ${rows * size}px`;
      el.dataset.state = "ready";
    },
    [angle, colors, fill, from, matrix, scale, to]
  );

  useFrameLoop(
    (time) => {
      timeRef.current = time * speed;
      draw(timeRef.current);
    },
    { enabled: animate, fps: 12, target: ref }
  );

  // Track the box and font size; redraw at the last time on any change.
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const measure = () => {
      const fontSize = Number.parseFloat(getComputedStyle(el).fontSize);
      const auto = Math.max(2, Math.round(fontSize / 24));
      sizeRef.current = {
        cell: cell ?? (Number.isFinite(auto) ? auto : readDitherCell(el)),
        height: el.offsetHeight,
        width: el.offsetWidth,
      };
      draw(timeRef.current);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [cell, draw]);

  const rootStyle: CSSProperties & Record<"--dither-text-ink", string> = {
    "--dither-text-ink": cssColor(palette.at(-1) ?? "--dither-ink"),
    // Until the dither is painted, a CSS mask at the average tone.
    ...(colors ? {} : ditherMaskStyle((from + to) / 2, { matrix })),
    ...style,
  };

  return (
    <Tag
      {...rest}
      ref={setRef}
      data-state="fallback"
      className={cn(
        "inline-block bg-no-repeat text-(--dither-text-ink) [image-rendering:pixelated]",
        "data-[state=ready]:bg-clip-text data-[state=ready]:text-transparent",
        "forced-colors:bg-none forced-colors:text-[CanvasText]",
        className
      )}
      style={rootStyle}
    >
      {children}
    </Tag>
  );
};
