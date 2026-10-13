"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type {
  ChangeEvent,
  ComponentProps,
  CSSProperties,
  DragEvent,
  ReactNode,
  RefObject,
} from "react";

import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DITHER_METHODS, ditherImage, useDitherColors } from "@/lib/dither";
import type {
  DitherMethod,
  ImagePalette,
  PaletteColor,
  Rgba,
} from "@/lib/dither";
import { download, toCSS, toPNG, toSVG } from "@/lib/dither/export";
import { cn } from "@/lib/utils";

/** A colour as `#rrggbb`, the format a colour input reads and writes. */
export type HexColor = `#${string}`;

/** Two to four colours, darkest (shadows) first. */
export type MakerPalette = readonly [HexColor, HexColor, ...HexColor[]];

/** Built-in sources that need no upload. */
export type MakerPattern = "orb" | "linear" | "radial" | "noise";

export type DitherMakerProps = Omit<
  ComponentProps<"div">,
  "children" | "defaultValue"
> & {
  /**
   * An image URL to start with. Cross-origin images need CORS headers,
   * or the canvas can't read them. Default: none, a generated pattern.
   */
  defaultImage?: string;
  /** Generated pattern to start with. Default `"orb"`. */
  defaultPattern?: MakerPattern;
  /** Dither method to start with. Default `"bayer4"`. */
  defaultMethod?: DitherMethod;
  /** Cell size in pixels to start with, 1 to 16. Default 4. */
  defaultCell?: number;
  /**
   * Start on a custom palette, darkest first. Default: the theme's
   * `--dither-paper` and `--dither-ink`.
   */
  defaultPalette?: MakerPalette;
  /** File name for exports, without the extension. Default `"dither"`. */
  filename?: string;
};

type SourceKind = "pattern" | "image";
type PaletteMode = "theme" | "custom";
type SizeKey = "landscape" | "square" | "portrait" | "wide" | "original";

interface LoadedImage {
  id: number;
  name: string;
  element: HTMLImageElement | ImageBitmap;
  width: number;
  height: number;
}

interface Grid {
  cols: number;
  rows: number;
}

const METHOD_LABELS = {
  atkinson: "Atkinson",
  bayer4: "Bayer 4 × 4",
  bayer8: "Bayer 8 × 8",
  "blue-noise": "Blue noise",
  "floyd-steinberg": "Floyd–Steinberg",
  "sierra-lite": "Sierra Lite",
} as const satisfies Record<DitherMethod, string>;

const PATTERN_LABELS = {
  linear: "Linear gradient",
  noise: "Noise",
  orb: "Lit orb",
  radial: "Radial glow",
} as const satisfies Record<MakerPattern, string>;

const PATTERNS = ["orb", "linear", "radial", "noise"] as const;

const SIZES = {
  landscape: { height: 900, label: "Landscape", width: 1600 },
  portrait: { height: 1350, label: "Portrait", width: 1080 },
  square: { height: 1200, label: "Square", width: 1200 },
  wide: { height: 800, label: "Banner", width: 2400 },
} as const satisfies Record<
  Exclude<SizeKey, "original">,
  { width: number; height: number; label: string }
>;

const SIZE_KEYS = ["landscape", "square", "portrait", "wide"] as const;

// Uploads keep their shape; the longest side is capped to keep it quick.
const MAX_ORIGINAL_SIDE = 2400;

const PRESETS = [
  { colors: ["#0a0a0b", "#f2efe8"], name: "Newsprint" },
  { colors: ["#081226", "#3d6bff", "#dfe7ff"], name: "Blueprint" },
  { colors: ["#140805", "#c2410c", "#fcd38a"], name: "Ember" },
  { colors: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"], name: "Handheld" },
] as const satisfies readonly { name: string; colors: MakerPalette }[];

const isOneOf = <T extends string>(
  options: readonly T[],
  value: string
): value is T => options.some((option) => option === value);

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/* ------------------------------------------------------------------ */
/* Sources: everything becomes a grid of tones, 0 dark to 1 light.     */
/* ------------------------------------------------------------------ */

interface PatternSettings {
  pattern: MakerPattern;
  angle: number;
  scale: number;
  seed: number;
}

const wrap256 = (value: number) => ((value % 256) + 256) % 256;

// Seeded lattice for value noise: a Park–Miller generator, no bitwise ops.
const createLattice = (seed: number) => {
  let state = (Math.floor(seed) % 2_147_483_646) + 1;
  const random = () => {
    state = (state * 16_807) % 2_147_483_647;
    return (state - 1) / 2_147_483_646;
  };
  const values = Float32Array.from({ length: 256 }, random);
  const perm = Uint8Array.from({ length: 256 }, (_, index) => index);
  for (let index = 255; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const held = perm[index] ?? 0;
    perm[index] = perm[swap] ?? 0;
    perm[swap] = held;
  }
  const at = (x: number, y: number) =>
    values[perm[wrap256(x + (perm[wrap256(y)] ?? 0))] ?? 0] ?? 0;

  return (x: number, y: number) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return top + (bottom - top) * sy;
  };
};

const patternTones = (
  { pattern, angle, scale, seed }: PatternSettings,
  { cols, rows }: Grid
): Float32Array => {
  const tones = new Float32Array(cols * rows);
  const aspect = cols / rows;
  const radians = (angle * Math.PI) / 180;
  const noise = pattern === "noise" ? createLattice(seed) : null;
  // Light direction for the orb, from the angle; always a little in front.
  const light = [Math.sin(radians) * 0.7, -Math.cos(radians) * 0.7, 0.72];
  const lightLength = Math.hypot(light[0] ?? 0, light[1] ?? 0, light[2] ?? 0);

  for (let y = 0; y < rows; y += 1) {
    const v = (y + 0.5) / rows;
    for (let x = 0; x < cols; x += 1) {
      const u = (x + 0.5) / cols;
      const px = (u - 0.5) * aspect;
      const py = v - 0.5;
      let tone = 0;
      switch (pattern) {
        case "linear": {
          const dirX = Math.sin(radians);
          const dirY = -Math.cos(radians);
          const extent = Math.abs(dirX) * aspect * 0.5 + Math.abs(dirY) * 0.5;
          tone = (px * dirX + py * dirY) / (2 * extent) + 0.5;
          break;
        }
        case "radial": {
          const distance = Math.hypot(px, py - 0.12) / (0.2 + scale * 0.08);
          tone = Math.exp(-distance * distance * 1.6);
          break;
        }
        case "noise": {
          let sum = 0;
          let amplitude = 0.5;
          let frequency = 1 + scale * 0.6;
          for (let octave = 0; octave < 5; octave += 1) {
            sum += amplitude * (noise?.(px * frequency, py * frequency) ?? 0);
            amplitude *= 0.5;
            frequency *= 2;
          }
          tone = smoothstep(0.25, 0.75, sum / 0.97);
          break;
        }
        case "orb": {
          const radius = 0.3;
          const ox = px - aspect * 0.08;
          const oy = py + 0.02;
          const distance = Math.hypot(ox, oy) / radius;
          const sky = 0.04 + 0.32 * v * v;
          if (distance < 1) {
            const nz = Math.sqrt(1 - distance * distance);
            const lambert =
              ((ox / radius) * (light[0] ?? 0) +
                (oy / radius) * (light[1] ?? 0) +
                nz * (light[2] ?? 0)) /
              lightLength;
            const rim = (1 - nz) ** 3 * 0.25;
            tone = 0.03 + 0.97 * Math.max(0, lambert) ** 1.15 + rim;
          } else {
            tone = sky + Math.exp(-(distance - 1) * 5) * 0.3;
          }
          break;
        }
        default: {
          const exhaustive: never = pattern;
          return exhaustive;
        }
      }
      tones[y * cols + x] = clamp(tone, 0, 1);
    }
  }
  return tones;
};

/** Draw the image to cover the grid, then read its luminance per cell. */
const imageTones = (image: LoadedImage, { cols, rows }: Grid) => {
  const canvas = document.createElement("canvas");
  canvas.width = cols;
  canvas.height = rows;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const tones = new Float32Array(cols * rows);
  if (!context) {
    return tones;
  }
  const scale = Math.max(cols / image.width, rows / image.height);
  const sw = cols / scale;
  const sh = rows / scale;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image.element,
    (image.width - sw) / 2,
    (image.height - sh) / 2,
    sw,
    sh,
    0,
    0,
    cols,
    rows
  );
  const { data } = context.getImageData(0, 0, cols, rows);
  for (let index = 0; index < tones.length; index += 1) {
    const offset = index * 4;
    const alpha = (data[offset + 3] ?? 255) / 255;
    const luma =
      (0.2126 * (data[offset] ?? 0) +
        0.7152 * (data[offset + 1] ?? 0) +
        0.0722 * (data[offset + 2] ?? 0)) /
      255;
    tones[index] = luma * alpha;
  }
  return tones;
};

/* ------------------------------------------------------------------ */
/* Dithering: tones → palette indices → colours.                       */
/* ------------------------------------------------------------------ */

type Rgb = readonly [number, number, number];

const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const hexToRgb = (hex: string): Rgb => {
  const channel = (start: number) =>
    Number.parseInt(hex.slice(start, start + 2), 16) / 255 || 0;
  return [channel(1), channel(3), channel(5)];
};

const rgbToHex = ([r, g, b]: Rgb): HexColor => {
  const part = (value: number) =>
    Math.round(clamp(value, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
};

/** A colour `t` of the way along the stops, mixed in sRGB. */
const sampleStops = (stops: readonly Rgb[], t: number): Rgb => {
  const position = clamp(t, 0, 1) * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(position));
  const from = stops[index] ?? [0, 0, 0];
  const to = stops[index + 1] ?? from;
  const f = position - index;
  return [
    from[0] + (to[0] - from[0]) * f,
    from[1] + (to[1] - from[1]) * f,
    from[2] + (to[2] - from[2]) * f,
  ];
};

const grayStep = (step: number, levels: number): PaletteColor => {
  const value = step / (levels - 1);
  return [value, value, value];
};

/** Evenly spaced greys; `ditherImage` snaps each cell to one of them. */
const grayPalette = (levels: number): ImagePalette => [
  grayStep(0, levels),
  grayStep(levels - 1, levels),
  ...Array.from({ length: levels - 2 }, (_, index) =>
    grayStep(index + 1, levels)
  ),
];

interface Adjustments {
  method: DitherMethod;
  levels: number;
  contrast: number;
  brightness: number;
  invert: boolean;
  stops: readonly Rgb[];
}

const ditherTones = (
  tones: Float32Array,
  { cols, rows }: Grid,
  { method, levels, contrast, brightness, invert, stops }: Adjustments
): ImageData => {
  // Contrast pivots on mid-grey: +100 triples the slope, -100 flattens it.
  const c = contrast / 100;
  const slope = c >= 0 ? 1 + c * 2 : 1 + c * 0.9;
  const lift = (brightness / 100) * 0.5;
  const gray = new Uint8ClampedArray(cols * rows * 4);
  for (let index = 0; index < tones.length; index += 1) {
    const base = tones[index] ?? 0;
    const tone = (invert ? 1 - base : base) - 0.5;
    const value = clamp(tone * slope + 0.5 + lift, 0, 1) * 255;
    const offset = index * 4;
    gray[offset] = value;
    gray[offset + 1] = value;
    gray[offset + 2] = value;
    gray[offset + 3] = 255;
  }

  const dithered = ditherImage(
    { data: gray, height: rows, width: cols },
    { method, palette: grayPalette(levels) }
  );

  const colors = Array.from({ length: levels }, (_, step) =>
    sampleStops(stops, step / (levels - 1))
  );
  const { data } = dithered;
  for (let offset = 0; offset < data.length; offset += 4) {
    const step = Math.round(((data[offset] ?? 0) / 255) * (levels - 1));
    const color = colors[step] ?? colors[0] ?? [0, 0, 0];
    data[offset] = color[0] * 255;
    data[offset + 1] = color[1] * 255;
    data[offset + 2] = color[2] * 255;
  }
  return dithered;
};

const formatBytes = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`;

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

const RANGE_CLASS = cn(
  "h-6 w-full cursor-pointer appearance-none bg-transparent outline-none",
  "[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--primary)_var(--fill),var(--muted)_var(--fill))]",
  "[&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-[box-shadow] [&::-webkit-slider-thumb]:duration-150",
  "focus-visible:[&::-webkit-slider-thumb]:ring-[3px] focus-visible:[&::-webkit-slider-thumb]:ring-ring/50",
  "[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted [&::-moz-range-progress]:h-1 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-primary",
  "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-background",
  "focus-visible:[&::-moz-range-thumb]:ring-[3px] focus-visible:[&::-moz-range-thumb]:ring-ring/50"
);

const Range = ({
  label,
  value,
  min,
  max,
  step = 1,
  format = String,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) => {
  const id = useId();
  // The webkit track paints the filled part from this custom property.
  const fillStyle: Record<string, string> = {
    "--fill": `${((value - min) / (max - min)) * 100}%`,
  };
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <label htmlFor={id}>{label}</label>
        <output
          htmlFor={id}
          className="text-muted-foreground font-mono text-xs tabular-nums"
        >
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className={RANGE_CLASS}
        style={fillStyle}
      />
    </div>
  );
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: (id: string) => ReactNode;
}) => {
  const id = useId();
  return (
    <div className="grid gap-1.5 *:data-[slot=native-select-wrapper]:w-full">
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      {children(id)}
    </div>
  );
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <fieldset className="grid min-w-0 gap-4 border-t px-4 py-4 first:border-t-0 sm:px-5">
    <legend className="sr-only">{title}</legend>
    <p
      aria-hidden="true"
      className="text-muted-foreground -mb-1 text-xs font-medium"
    >
      {title}
    </p>
    {children}
  </fieldset>
);

const SEGMENT_LIST =
  "bg-muted/70 grid h-9 w-full auto-cols-fr grid-flow-col rounded-full p-0.5";
// Radix marks the selected tab with data-state="active", Base UI with
// data-active; style both so either shadcn base works.
const SEGMENT_TRIGGER = cn(
  "text-muted-foreground hover:text-foreground h-full rounded-full border-0 px-3 text-[0.8rem] transition-colors duration-150",
  "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:border-0 dark:data-[state=active]:bg-background",
  "data-active:bg-background data-active:text-foreground data-active:shadow-none dark:data-active:border-0 dark:data-active:bg-background"
);

const ICON_CLASS = "size-4 shrink-0";

const DownloadIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={ICON_CLASS}
  >
    <path d="M8 2.5v8M4.75 7.5 8 10.75l3.25-3.25M3 13.25h10" />
  </svg>
);

const CopyIcon = ({ copied }: { copied: boolean }) => (
  <span aria-hidden="true" className="relative size-4 shrink-0">
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "absolute inset-0 size-4 transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
        copied ? "scale-25 opacity-0 blur-[4px]" : "opacity-100"
      )}
    >
      <rect x="5.25" y="5.25" width="8" height="8" rx="1.75" />
      <path d="M10.75 5.25v-1.5a1 1 0 0 0-1-1H3.75a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1.5" />
    </svg>
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "absolute inset-0 size-4 transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
        copied ? "opacity-100" : "scale-25 opacity-0 blur-[4px]"
      )}
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  </span>
);

/* ------------------------------------------------------------------ */
/* The maker                                                           */
/* ------------------------------------------------------------------ */

let nextImageId = 1;

const imageFromFile = async (file: File): Promise<LoadedImage> => {
  const bitmap = await createImageBitmap(file);
  nextImageId += 1;
  return {
    element: bitmap,
    height: bitmap.height,
    id: nextImageId,
    name: file.name,
    width: bitmap.width,
  };
};

const imageFromUrl = async (src: string): Promise<LoadedImage> => {
  const element = new Image();
  element.crossOrigin = "anonymous";
  element.src = src;
  await element.decode();
  nextImageId += 1;
  return {
    element,
    height: element.naturalHeight,
    id: nextImageId,
    name: src.split("/").pop() ?? "image",
    width: element.naturalWidth,
  };
};

const outputSize = (
  size: SizeKey,
  image: LoadedImage | null
): { width: number; height: number } => {
  if (size !== "original") {
    return SIZES[size];
  }
  if (!image) {
    return SIZES.landscape;
  }
  const fit = Math.min(
    1,
    MAX_ORIGINAL_SIDE / Math.max(image.width, image.height)
  );
  return {
    height: Math.round(image.height * fit),
    width: Math.round(image.width * fit),
  };
};

const gridFor = (
  size: SizeKey,
  image: LoadedImage | null,
  cell: number
): Grid & { width: number; height: number } => {
  const { width, height } = outputSize(size, image);
  const cols = Math.max(8, Math.round(width / cell));
  const rows = Math.max(8, Math.round(height / cell));
  return { cols, height: rows * cell, rows, width: cols * cell };
};

interface SourceSettings {
  kind: SourceKind;
  pattern: MakerPattern;
  angle: number;
  scale: number;
  seed: number;
  size: SizeKey;
}

interface Tuning {
  method: DitherMethod;
  cell: number;
  levels: number;
  contrast: number;
  brightness: number;
  invert: boolean;
}

interface PaletteSettings {
  mode: PaletteMode;
  custom: readonly HexColor[];
}

const toRgb = ([r, g, b]: Rgba): Rgb => [r, g, b];

/**
 * The palette stops as one string, so effects re-run only when a colour
 * really changes. Theme colours are re-read when the site theme changes.
 */
const useStopsKey = (
  rootRef: RefObject<HTMLDivElement | null>,
  palette: PaletteSettings
) => {
  const theme = useDitherColors(rootRef);
  if (palette.mode === "custom") {
    return palette.custom.map((color) => rgbToHex(hexToRgb(color))).join(",");
  }
  if (!theme) {
    return "";
  }
  const [ink, paper] = theme.map(toRgb);
  if (!ink || !paper) {
    return "";
  }
  // Shadows take the darker theme colour, so photos read the right way
  // round in both light and dark mode.
  const stops =
    luminance(paper) <= luminance(ink) ? [paper, ink] : [ink, paper];
  return stops.map(rgbToHex).join(",");
};

/** Runs the pipeline on the frame after any input changes. */
const useDitherResult = ({
  source,
  image,
  grid,
  tuning,
  stopsKey,
}: {
  source: SourceSettings;
  image: LoadedImage | null;
  grid: Grid;
  tuning: Tuning;
  stopsKey: string;
}) => {
  const [result, setResult] = useState<ImageData | null>(null);
  const tonesRef = useRef<{ key: string; tones: Float32Array } | null>(null);
  const { cols, rows } = grid;
  const { pattern, angle, scale, seed } = source;
  const { method, levels, contrast, brightness, invert } = tuning;
  const activeImage = source.kind === "image" ? image : null;

  useEffect(() => {
    if (!stopsKey) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const size = { cols, rows };
      const key = activeImage
        ? `image:${activeImage.id}:${cols}x${rows}`
        : `pattern:${pattern}:${angle}:${scale}:${seed}:${cols}x${rows}`;
      let tones = tonesRef.current?.key === key ? tonesRef.current.tones : null;
      if (!tones) {
        tones = activeImage
          ? imageTones(activeImage, size)
          : patternTones({ angle, pattern, scale, seed }, size);
        tonesRef.current = { key, tones };
      }
      setResult(
        ditherTones(tones, size, {
          brightness,
          contrast,
          invert,
          levels,
          method,
          stops: stopsKey.split(",").map(hexToRgb),
        })
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [
    activeImage,
    angle,
    brightness,
    cols,
    contrast,
    invert,
    levels,
    method,
    pattern,
    rows,
    scale,
    seed,
    stopsKey,
  ]);

  return result;
};

const signed = (value: number) => (value > 0 ? `+${value}` : String(value));

const SourceSection = ({
  source,
  image,
  onChange,
  onChooseFile,
}: {
  source: SourceSettings;
  image: LoadedImage | null;
  onChange: (patch: Partial<SourceSettings>) => void;
  onChooseFile: () => void;
}) => {
  const { kind, pattern, angle, scale } = source;
  const showOriginal = kind === "image" && image !== null;
  const size =
    source.size === "original" && !showOriginal ? "landscape" : source.size;
  const usesAngle = pattern === "linear" || pattern === "orb";

  return (
    <Section title="Source">
      <Tabs
        value={kind}
        onValueChange={(value) => {
          if (isOneOf(["pattern", "image"], value)) {
            onChange({ kind: value });
          }
        }}
      >
        <TabsList aria-label="Source" className={SEGMENT_LIST}>
          <TabsTrigger value="pattern" className={SEGMENT_TRIGGER}>
            Generate
          </TabsTrigger>
          <TabsTrigger value="image" className={SEGMENT_TRIGGER}>
            Image
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {kind === "pattern" ? (
        <>
          <Field label="Pattern">
            {(id) => (
              <NativeSelect
                id={id}
                value={pattern}
                onChange={(event) => {
                  if (isOneOf(PATTERNS, event.target.value)) {
                    onChange({ pattern: event.target.value });
                  }
                }}
                className="w-full"
              >
                {PATTERNS.map((key) => (
                  <NativeSelectOption key={key} value={key}>
                    {PATTERN_LABELS[key]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </Field>
          {usesAngle ? (
            <Range
              label={pattern === "orb" ? "Light angle" : "Angle"}
              value={angle}
              min={0}
              max={360}
              format={(value) => `${value}°`}
              onChange={(value) => onChange({ angle: value })}
            />
          ) : (
            <Range
              label={pattern === "noise" ? "Scale" : "Size"}
              value={scale}
              min={1}
              max={10}
              onChange={(value) => onChange({ scale: value })}
            />
          )}
          {pattern === "noise" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChange({ seed: (source.seed * 31 + 17) % 9973 })}
            >
              New noise
            </Button>
          ) : null}
        </>
      ) : (
        <div className="grid gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onChooseFile}
          >
            {image ? "Replace image" : "Choose image"}
          </Button>
          <p className="text-muted-foreground truncate text-xs">
            {image
              ? `${image.name}, ${image.width} × ${image.height}`
              : "PNG, JPEG, WebP or GIF. You can also drop it on the preview."}
          </p>
        </div>
      )}
      <Field label="Output size">
        {(id) => (
          <NativeSelect
            id={id}
            value={size}
            onChange={(event) => {
              if (isOneOf([...SIZE_KEYS, "original"], event.target.value)) {
                onChange({ size: event.target.value });
              }
            }}
            className="w-full"
          >
            {showOriginal ? (
              <NativeSelectOption value="original">
                {`Original · ${outputSize("original", image).width} × ${outputSize("original", image).height}`}
              </NativeSelectOption>
            ) : null}
            {SIZE_KEYS.map((key) => (
              <NativeSelectOption key={key} value={key}>
                {`${SIZES[key].label} · ${SIZES[key].width} × ${SIZES[key].height}`}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </Field>
    </Section>
  );
};

const DitherSection = ({
  tuning,
  onChange,
}: {
  tuning: Tuning;
  onChange: (patch: Partial<Tuning>) => void;
}) => (
  <Section title="Dither">
    <Field label="Method">
      {(id) => (
        <NativeSelect
          id={id}
          value={tuning.method}
          onChange={(event) => {
            if (isOneOf(DITHER_METHODS, event.target.value)) {
              onChange({ method: event.target.value });
            }
          }}
          className="w-full"
        >
          {DITHER_METHODS.map((key) => (
            <NativeSelectOption key={key} value={key}>
              {METHOD_LABELS[key]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
    </Field>
    <Range
      label="Cell size"
      value={tuning.cell}
      min={1}
      max={16}
      format={(value) => `${value}px`}
      onChange={(value) => onChange({ cell: value })}
    />
    <Range
      label="Levels"
      value={tuning.levels}
      min={2}
      max={8}
      onChange={(value) => onChange({ levels: value })}
    />
    <Range
      label="Contrast"
      value={tuning.contrast}
      min={-100}
      max={100}
      format={signed}
      onChange={(value) => onChange({ contrast: value })}
    />
    <Range
      label="Brightness"
      value={tuning.brightness}
      min={-100}
      max={100}
      format={signed}
      onChange={(value) => onChange({ brightness: value })}
    />
    <label className="flex items-center justify-between gap-3 text-sm">
      Invert tones
      <input
        type="checkbox"
        checked={tuning.invert}
        onChange={(event) => onChange({ invert: event.target.checked })}
        className="accent-primary focus-visible:ring-ring/50 size-4 rounded outline-none focus-visible:ring-[3px]"
      />
    </label>
  </Section>
);

const swatchLabel = (index: number, count: number) => {
  const role = [
    index === 0 ? "shadows" : "",
    index === count - 1 ? "highlights" : "",
  ]
    .filter(Boolean)
    .join(", ");
  return `Colour ${index + 1} of ${count}${role ? `, ${role}` : ""}`;
};

const PaletteSection = ({
  palette,
  onChange,
  onPreset,
}: {
  palette: PaletteSettings;
  onChange: (patch: Partial<PaletteSettings>) => void;
  onPreset: (colors: MakerPalette) => void;
}) => {
  const { mode, custom } = palette;
  const setColor = (index: number, value: string) => {
    if (!value.startsWith("#")) {
      return;
    }
    const next: HexColor = `#${value.slice(1)}`;
    onChange({
      custom: custom.map((color, at) => (at === index ? next : color)),
    });
  };

  return (
    <Section title="Colour">
      <Tabs
        value={mode}
        onValueChange={(value) => {
          if (isOneOf(["theme", "custom"], value)) {
            onChange({ mode: value });
          }
        }}
      >
        <TabsList aria-label="Palette" className={SEGMENT_LIST}>
          <TabsTrigger value="theme" className={SEGMENT_TRIGGER}>
            Theme
          </TabsTrigger>
          <TabsTrigger value="custom" className={SEGMENT_TRIGGER}>
            Custom
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {mode === "theme" ? (
        <p className="text-muted-foreground text-xs text-pretty">
          Paper and ink from your theme, with any extra levels mixed between
          them. Exports use the colours shown now.
        </p>
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {custom.map((color, index) => (
              <label
                key={`${index}-${custom.length}`}
                className="has-focus-visible:ring-ring/50 relative size-8 cursor-pointer rounded-full shadow-[inset_0_0_0_1px_oklch(0.5_0_0/0.3)] has-focus-visible:ring-[3px]"
                style={{ backgroundColor: color } satisfies CSSProperties}
              >
                <span className="sr-only">
                  {swatchLabel(index, custom.length)}
                </span>
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(index, event.target.value)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </label>
            ))}
            <div className="ml-auto flex gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Remove the last colour"
                disabled={custom.length <= 2}
                onClick={() => onChange({ custom: custom.slice(0, -1) })}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  −
                </span>
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Add a colour"
                disabled={custom.length >= 4}
                onClick={() =>
                  onChange({ custom: [...custom, custom.at(-1) ?? "#ffffff"] })
                }
              >
                <span aria-hidden="true" className="text-base leading-none">
                  +
                </span>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => onPreset(preset.colors)}
                className="bg-muted/60 hover:bg-muted focus-visible:ring-ring/50 inline-flex h-7 items-center gap-1.5 rounded-full pr-2.5 pl-1.5 text-xs transition-colors duration-150 outline-none focus-visible:ring-[3px]"
              >
                <span aria-hidden="true" className="flex">
                  {preset.colors.map((color) => (
                    <span
                      key={color}
                      className="-ml-1 size-3.5 rounded-full shadow-[0_0_0_1.5px_var(--card)] first:ml-0"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
};

const ExportBar = ({
  result,
  cell,
  filename,
  zoom,
  onZoom,
  onStatus,
}: {
  result: ImageData | null;
  cell: number;
  filename: string;
  zoom: Zoom;
  onZoom: (zoom: Zoom) => void;
  onStatus: (message: string) => void;
}) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    []
  );

  const exportPNG = async () => {
    if (!result) {
      return;
    }
    const blob = await toPNG(result, { scale: cell });
    download({ data: blob, filename: `${filename}.png` });
    onStatus(
      `Saved ${filename}.png, ${result.width * cell} × ${result.height * cell}, ${formatBytes(blob.size)}.`
    );
  };

  const exportSVG = () => {
    if (!result) {
      return;
    }
    const svg = toSVG(result, { cell });
    download({ data: svg, filename: `${filename}.svg`, type: "image/svg+xml" });
    onStatus(`Saved ${filename}.svg, ${formatBytes(svg.length)}.`);
  };

  const copyCSS = async () => {
    if (!result) {
      return;
    }
    const css = toCSS({
      image: result,
      kind: "image",
      selector: `.${filename}`,
    });
    try {
      await navigator.clipboard.writeText(css);
      onStatus(`Copied the CSS, ${formatBytes(css.length)}.`);
      setCopied(true);
      if (timer.current) {
        clearTimeout(timer.current);
      }
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      download({ data: css, filename: `${filename}.css`, type: "text/css" });
      onStatus(
        `The clipboard is unavailable, so ${filename}.css was saved instead.`
      );
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 items-center gap-3">
        <Tabs
          value={zoom}
          onValueChange={(value) => {
            if (isOneOf(["fit", "actual"], value)) {
              onZoom(value);
            }
          }}
        >
          <TabsList
            aria-label="Preview zoom"
            className="bg-muted/70 h-8 rounded-full p-0.5"
          >
            <TabsTrigger value="fit" className={SEGMENT_TRIGGER}>
              Fit
            </TabsTrigger>
            <TabsTrigger
              value="actual"
              aria-label="Actual size"
              className={SEGMENT_TRIGGER}
            >
              1:1
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!result}
          onClick={exportPNG}
        >
          <DownloadIcon />
          PNG
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!result}
          onClick={exportSVG}
        >
          <DownloadIcon />
          SVG
        </Button>
        <Button type="button" size="sm" disabled={!result} onClick={copyCSS}>
          <CopyIcon copied={copied} />
          {copied ? "Copied" : "Copy CSS"}
        </Button>
      </div>
    </div>
  );
};

type Zoom = "fit" | "actual";

const MAX_STAGE_HEIGHT = 544;

interface Box {
  width: number;
  height: number;
}

/**
 * How big to draw the preview. Fit uses the largest whole number of device
 * pixels per cell that fits, so every cell is the same size and the
 * pattern never shimmers; only an output with more cells than the screen
 * has pixels is scaled down unevenly. Actual size draws `cell` CSS pixels
 * per cell, as the export will.
 */
const displaySize = ({
  box,
  cell,
  image,
  zoom,
}: {
  box: Box;
  cell: number;
  image: Box;
  zoom: Zoom;
}): Box => {
  if (zoom === "actual") {
    return { height: image.height * cell, width: image.width * cell };
  }
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min(box.width / image.width, box.height / image.height);
  const whole = Math.floor(fit * dpr);
  const scale = whole >= 1 ? whole / dpr : fit;
  return { height: image.height * scale, width: image.width * scale };
};

const Stage = ({
  result,
  empty,
  label,
  cell,
  zoom,
  onFile,
  onChooseFile,
}: {
  result: ImageData | null;
  empty: boolean;
  label: string;
  cell: number;
  zoom: Zoom;
  onFile: (file: File | undefined) => void;
  onChooseFile: () => void;
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [dragging, setDragging] = useState(false);

  // Track the frame's width; the height cap keeps tall outputs on screen.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setBox({
          height: Math.min(MAX_STAGE_HEIGHT, window.innerHeight * 0.7),
          width: entry.contentRect.width,
        });
      }
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result) {
      return;
    }
    canvas.width = result.width;
    canvas.height = result.height;
    canvas.getContext("2d")?.putImageData(result, 0, 0);
  }, [result]);

  // Open actual size on the middle of the picture, not its corner.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || zoom !== "actual") {
      return;
    }
    frame.scrollLeft = (frame.scrollWidth - frame.clientWidth) / 2;
    frame.scrollTop = (frame.scrollHeight - frame.clientHeight) / 2;
  }, [zoom]);

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
      setDragging(true);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    onFile(event.dataTransfer.files[0]);
  };

  const size =
    result && box && !empty
      ? displaySize({ box, cell, image: result, zoom })
      : null;
  const placeholder = box ? Math.min(box.height, box.width * 0.6) : 320;
  const frameHeight = size
    ? Math.min(size.height, box?.height ?? size.height)
    : placeholder;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className="bg-card relative isolate min-w-0 rounded-[20px] p-3 @md:p-5"
    >
      <div
        ref={frameRef}
        style={{ height: frameHeight }}
        className="grid w-full min-w-0 [place-items:safe_center] overflow-auto overscroll-contain"
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={label}
          style={size ? { height: size.height, width: size.width } : undefined}
          className={cn(
            "max-w-none shrink-0 [image-rendering:pixelated] transition-opacity duration-200",
            size ? "opacity-100" : "size-0 opacity-0"
          )}
        />
      </div>
      {empty ? (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div className="grid max-w-64 justify-items-center gap-3">
            <p className="text-sm text-pretty">
              Drop an image here, or choose one from your device.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onChooseFile}
            >
              Choose image
            </Button>
            <p className="text-muted-foreground text-xs">
              It stays on your device.
            </p>
          </div>
        </div>
      ) : null}
      <div
        aria-hidden="true"
        className={cn(
          "bg-background/80 ring-primary pointer-events-none absolute inset-2 grid place-items-center rounded-[14px] text-sm ring-2 backdrop-blur-sm transition-opacity duration-150",
          dragging ? "opacity-100" : "opacity-0"
        )}
      >
        Drop to dither
      </div>
    </div>
  );
};

/** Loads `defaultImage` once, reporting failures through `onError`. */
const useDefaultImage = ({
  src,
  onLoad,
  onError,
}: {
  src: string | undefined;
  onLoad: (image: LoadedImage) => void;
  onError: () => void;
}) => {
  const handlers = useRef({ onError, onLoad });
  handlers.current = { onError, onLoad };

  useEffect(() => {
    if (!src) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const loaded = await imageFromUrl(src);
        if (!cancelled) {
          handlers.current.onLoad(loaded);
        }
      } catch {
        if (!cancelled) {
          handlers.current.onError();
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [src]);
};

/**
 * A dither playground: pick a generated pattern or drop in an image, tune
 * the method, levels, cell size, contrast, brightness and palette, and
 * export the result as PNG, SVG or CSS. Everything runs in the browser.
 */
export const DitherMaker = ({
  defaultImage,
  defaultPattern = "orb",
  defaultMethod = "bayer4",
  defaultCell = 4,
  defaultPalette,
  filename = "dither",
  className,
  ...props
}: DitherMakerProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<SourceSettings>(() => ({
    angle: defaultPattern === "linear" ? 160 : 315,
    kind: defaultImage ? "image" : "pattern",
    pattern: defaultPattern,
    scale: 4,
    seed: 7,
    size: "landscape",
  }));
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [tuning, setTuning] = useState<Tuning>(() => ({
    brightness: 0,
    cell: clamp(Math.round(defaultCell), 1, 16),
    contrast: 0,
    invert: false,
    levels: defaultPalette?.length ?? 2,
    method: defaultMethod,
  }));
  const [palette, setPalette] = useState<PaletteSettings>(() => ({
    custom: defaultPalette ?? PRESETS[1].colors,
    mode: defaultPalette ? "custom" : "theme",
  }));
  const [status, setStatus] = useState("");
  const [zoom, setZoom] = useState<Zoom>("fit");

  const patchSource = (patch: Partial<SourceSettings>) =>
    setSource((current) => ({ ...current, ...patch }));
  const patchTuning = (patch: Partial<Tuning>) =>
    setTuning((current) => ({ ...current, ...patch }));
  const patchPalette = (patch: Partial<PaletteSettings>) =>
    setPalette((current) => ({ ...current, ...patch }));

  useDefaultImage({
    onError: () => {
      setStatus("The starting image could not be loaded.");
      patchSource({ kind: "pattern" });
    },
    onLoad: (loaded) => {
      setImage(loaded);
      patchSource({ size: "original" });
    },
    src: defaultImage,
  });

  const showImage = source.kind === "image" && image !== null;
  const grid = gridFor(
    source.size === "original" && !showImage ? "landscape" : source.size,
    showImage ? image : null,
    tuning.cell
  );
  const stopsKey = useStopsKey(rootRef, palette);
  const result = useDitherResult({ grid, image, source, stopsKey, tuning });
  const empty = source.kind === "image" && !image;

  const loadFile = useCallback(async (file: File | undefined) => {
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setStatus(`${file.name} is not an image. Try a PNG, JPEG or WebP.`);
      return;
    }
    try {
      const loaded = await imageFromFile(file);
      setImage(loaded);
      setSource((current) => ({ ...current, kind: "image", size: "original" }));
      setStatus(`Loaded ${loaded.name}, ${loaded.width} × ${loaded.height}.`);
    } catch {
      setStatus(`${file.name} could not be read.`);
    }
  }, []);

  const chooseFile = () => fileRef.current?.click();

  return (
    <div
      ref={rootRef}
      className={cn("@container w-full min-w-0", className)}
      {...props}
    >
      <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_17.5rem] @3xl:items-start">
        <div className="grid min-w-0 gap-3 @3xl:sticky @3xl:top-[calc(var(--header-height,3.5rem)+1.5rem)]">
          <Stage
            cell={tuning.cell}
            zoom={zoom}
            result={result}
            empty={empty}
            label={`Dither preview, ${grid.cols} by ${grid.rows} cells`}
            onFile={loadFile}
            onChooseFile={chooseFile}
          />
          <ExportBar
            result={empty ? null : result}
            cell={tuning.cell}
            filename={filename}
            zoom={zoom}
            onZoom={setZoom}
            onStatus={setStatus}
          />
          <div className="text-muted-foreground flex min-h-5 flex-wrap justify-between gap-x-4 gap-y-1 text-xs">
            <p className="font-mono tabular-nums">
              {`${grid.cols} × ${grid.rows} cells · ${grid.width} × ${grid.height} px`}
            </p>
            <p role="status">{status}</p>
          </div>
        </div>

        <div className="bg-card min-w-0 overflow-hidden rounded-[20px]">
          <SourceSection
            source={source}
            image={image}
            onChange={patchSource}
            onChooseFile={chooseFile}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              loadFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <DitherSection tuning={tuning} onChange={patchTuning} />
          <PaletteSection
            palette={palette}
            onChange={patchPalette}
            onPreset={(colors) => {
              patchPalette({ custom: colors, mode: "custom" });
              patchTuning({ levels: colors.length });
            }}
          />
        </div>
      </div>
    </div>
  );
};
