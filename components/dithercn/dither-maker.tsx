"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChangeEvent,
  ComponentProps,
  CSSProperties,
  DragEvent,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  RefObject,
} from "react";

import { DitherExportPanel } from "@/components/dithercn/dither-export-panel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  cssColor,
  DITHER_METHODS,
  ditherImage,
  fillStyle,
  resolveColor,
  subscribeToTheme,
} from "@/lib/dither";
import type {
  DitherColor,
  DitherMatrix,
  DitherMethod,
  DitherPalette,
  ImagePalette,
  PaletteColor,
} from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * Direction: a small focused design app, not a form. References: Figma's
 * canvas-plus-inspector split (the stage gets the room, the inspector is
 * a dense column of labelled rows) and Aseprite's honesty about pixels
 * (zoom to real pixels, nothing smoothed). Black stage with a faint cell
 * grid, the dithercn ink for every selected state, mono readouts.
 * Signature: looks you pick by seeing them (every preset, pattern and
 * method thumbnail is the real engine on your current source) and a
 * split compare you drag across the canvas.
 * Avoiding: a long column of native selects, a white primary button,
 * empty boxes, and a drop zone that reads like an error.
 */

/** A colour as `#rrggbb`, the format a colour input reads and writes. */
export type HexColor = `#${string}`;

/** Built-in sources that need no upload. */
export type MakerPattern = "orb" | "linear" | "radial" | "noise";

/** Everything that decides how the source is dithered. */
export interface MakerLook {
  /** Dither method. */
  method: DitherMethod;
  /** Output pixels per cell, 1 to 16. */
  cell: number;
  /** How many colours the result uses, 2 to 8, mixed along the palette. */
  tones: number;
  /** -100 to 100, applied before dithering. */
  contrast: number;
  /** -100 to 100, applied before dithering. */
  brightness: number;
  /** Swap shadows and highlights. */
  invert: boolean;
  /**
   * Two to four colours: palette names (`"blue"`, `"ink"`), CSS variables
   * (`"--dither-paper"`) or CSS colours. They are laid out dark to light,
   * so the order you give them in does not matter.
   */
  palette: DitherPalette;
}

/** A ready look shown in the preset strip. */
export interface MakerPreset {
  id: string;
  name: string;
  look: MakerLook;
}

/** A picture offered in the empty image state. */
export interface MakerSample {
  name: string;
  /** Same-origin URL, or one served with CORS headers. */
  src: string;
}

/** The looks the maker ships with. Named colours follow light and dark. */
export const MAKER_PRESETS = [
  {
    id: "ink",
    look: {
      brightness: 0,
      cell: 4,
      contrast: 0,
      invert: false,
      method: "bayer4",
      palette: ["--dither-paper", "ink"],
      tones: 2,
    },
    name: "Ink",
  },
  {
    id: "blueprint",
    look: {
      brightness: 0,
      cell: 3,
      contrast: 10,
      invert: false,
      method: "bayer8",
      palette: ["#06102a", "blue", "#e6edff"],
      tones: 3,
    },
    name: "Blueprint",
  },
  {
    id: "newsprint",
    look: {
      brightness: 5,
      cell: 2,
      contrast: 25,
      invert: false,
      method: "floyd-steinberg",
      palette: ["#161514", "#efeae0"],
      tones: 2,
    },
    name: "Newsprint",
  },
  {
    id: "riso",
    look: {
      brightness: 0,
      cell: 3,
      contrast: 15,
      invert: false,
      method: "atkinson",
      palette: ["#1d1846", "pink", "#f6efe4"],
      tones: 3,
    },
    name: "Riso",
  },
  {
    id: "ember",
    look: {
      brightness: 0,
      cell: 3,
      contrast: 20,
      invert: false,
      method: "sierra-lite",
      palette: ["#170905", "orange", "#ffe2b0"],
      tones: 3,
    },
    name: "Ember",
  },
  {
    id: "signal",
    look: {
      brightness: 0,
      cell: 3,
      contrast: 30,
      invert: false,
      method: "blue-noise",
      palette: ["#000000", "green"],
      tones: 2,
    },
    name: "Signal",
  },
  {
    id: "dusk",
    look: {
      brightness: 0,
      cell: 4,
      contrast: 10,
      invert: false,
      method: "bayer8",
      palette: ["#120a24", "purple", "pink", "#ffd9c2"],
      tones: 4,
    },
    name: "Dusk",
  },
  {
    id: "handheld",
    look: {
      brightness: 5,
      cell: 5,
      contrast: 15,
      invert: false,
      method: "bayer4",
      palette: ["#0f380f", "#306230", "#8bac0f", "#c4d65a"],
      tones: 4,
    },
    name: "Handheld",
  },
] as const satisfies readonly MakerPreset[];

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
  /** The preset strip. Default `MAKER_PRESETS`. */
  presets?: readonly MakerPreset[];
  /** Id of the preset to start on. Default: the first preset. */
  defaultPreset?: string;
  /** Pictures to offer when no image is loaded. Default none. */
  samples?: readonly MakerSample[];
  /** File name for exports, without the extension. Default `"dither"`. */
  filename?: string;
};

type SourceKind = "pattern" | "image";
type SizeKey = "landscape" | "square" | "portrait" | "wide" | "original";
type Zoom = "fit" | "actual" | "double";
type InspectorTab = "source" | "pattern" | "colour" | "output";

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
  bayer4: "Bayer 4",
  bayer8: "Bayer 8",
  "blue-noise": "Blue noise",
  "floyd-steinberg": "Floyd",
  "sierra-lite": "Sierra",
} as const satisfies Record<DitherMethod, string>;

const METHOD_NOTES = {
  atkinson:
    "Diffusion that drops a quarter of the error. Bright, high contrast, Mac classic.",
  bayer4:
    "Ordered 4 × 4 pattern. Tiles cleanly, crisp on gradients and flat shapes.",
  bayer8: "Ordered 8 × 8 pattern. Smoother steps than Bayer 4, still regular.",
  "blue-noise": "Ordered, but scattered. No visible grid, film-grain feel.",
  "floyd-steinberg": "Error diffusion. Keeps the most detail in photos.",
  "sierra-lite": "Light, fast diffusion. Softer texture than Floyd–Steinberg.",
} as const satisfies Record<DitherMethod, string>;

const PATTERN_LABELS = {
  linear: "Linear",
  noise: "Noise",
  orb: "Orb",
  radial: "Glow",
} as const satisfies Record<MakerPattern, string>;

const PATTERNS = ["orb", "linear", "radial", "noise"] as const;

const SIZES = {
  landscape: { height: 900, label: "16:9", width: 1600 },
  portrait: { height: 1350, label: "4:5", width: 1080 },
  square: { height: 1200, label: "1:1", width: 1200 },
  wide: { height: 800, label: "3:1", width: 2400 },
} as const satisfies Record<
  Exclude<SizeKey, "original">,
  { width: number; height: number; label: string }
>;

const SIZE_KEYS = ["landscape", "square", "portrait", "wide"] as const;

// Uploads keep their shape; the longest side is capped to keep it quick.
const MAX_ORIGINAL_SIDE = 2400;

/** Colours offered for a palette stop, theme first. */
const STOP_SWATCHES = [
  "--dither-paper",
  "ink",
  "blue",
  "purple",
  "green",
  "pink",
  "orange",
  "red",
  "grey",
  "#000000",
  "#ffffff",
] as const satisfies readonly DitherColor[];

const SWATCH_NAMES: Readonly<Record<string, string>> = {
  "#000000": "Black",
  "#ffffff": "White",
  "--dither-paper": "Paper",
  ink: "Ink",
};

const swatchName = (color: DitherColor) =>
  SWATCH_NAMES[color] ??
  (color.startsWith("#")
    ? color
    : `${color.charAt(0).toUpperCase()}${color.slice(1)}`);

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

/* ------------------------------------------------------------------ */
/* Loading                                                             */
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

/** The same curve the dither applies, without the dithering. */
const adjustTone = (
  base: number,
  {
    contrast,
    brightness,
    invert,
  }: Pick<MakerLook, "contrast" | "brightness" | "invert">
) => {
  const c = contrast / 100;
  const slope = c >= 0 ? 1 + c * 2 : 1 + c * 0.9;
  const tone = (invert ? 1 - base : base) - 0.5;
  return clamp(tone * slope + 0.5 + (brightness / 100) * 0.5, 0, 1);
};

/** Tones mapped straight onto the palette ramp: the "before" of a pattern. */
const rampImage = (
  tones: Float32Array,
  { cols, rows }: Grid,
  look: Pick<MakerLook, "contrast" | "brightness" | "invert">,
  stops: readonly Rgb[]
) => {
  const data = new Uint8ClampedArray(cols * rows * 4);
  for (let index = 0; index < tones.length; index += 1) {
    const [r, g, b] = sampleStops(stops, adjustTone(tones[index] ?? 0, look));
    const offset = index * 4;
    data[offset] = r * 255;
    data[offset + 1] = g * 255;
    data[offset + 2] = b * 255;
    data[offset + 3] = 255;
  }
  return new ImageData(data, cols, rows);
};

/** A horizontal tone ramp, for the method thumbnails. */
const rampTones = ({ cols, rows }: Grid) => {
  const tones = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      tones[y * cols + x] = (x + 0.5) / cols;
    }
  }
  return tones;
};

const sourceTones = (
  source: SourceSettings,
  image: LoadedImage | null,
  grid: Grid
) =>
  source.kind === "image" && image
    ? imageTones(image, grid)
    : patternTones(source, grid);

/* ------------------------------------------------------------------ */
/* Sizes                                                               */
/* ------------------------------------------------------------------ */

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

/** A small grid with the output's shape, for thumbnails. */
const thumbGrid = (grid: Grid, longest: number): Grid => {
  const scale = longest / Math.max(grid.cols, grid.rows);
  return {
    cols: Math.max(4, Math.round(grid.cols * scale)),
    rows: Math.max(4, Math.round(grid.rows * scale)),
  };
};

/** Ordered methods map onto a CSS tile matrix; diffusion falls back. */
const tileMatrix = (method: DitherMethod): DitherMatrix =>
  method === "bayer8" || method === "blue-noise" ? method : "bayer4";

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

interface SourceSettings {
  kind: SourceKind;
  pattern: MakerPattern;
  angle: number;
  scale: number;
  seed: number;
}

type Resolve = (color: DitherColor) => Rgb;

/**
 * Turns palette names and CSS variables into sRGB in the maker's own
 * context, and starts over when the site theme changes. `null` until
 * mounted, because it reads computed styles.
 */
const useColorResolver = (
  rootRef: RefObject<HTMLElement | null>
): Resolve | null => {
  const [theme, setTheme] = useState(0);
  useEffect(() => {
    setTheme(1);
    return subscribeToTheme(() => setTheme((current) => current + 1));
  }, []);
  return useMemo(() => {
    if (theme === 0) {
      return null;
    }
    const cache = new Map<string, Rgb>();
    return (color: DitherColor) => {
      const known = cache.get(color);
      if (known) {
        return known;
      }
      const [r, g, b] = resolveColor(color, rootRef.current);
      const rgb: Rgb = [r, g, b];
      cache.set(color, rgb);
      return rgb;
    };
  }, [theme, rootRef]);
};

/** Palette stops dark to light, each with its index in the palette. */
const orderStops = (palette: DitherPalette, resolve: Resolve | null) =>
  palette
    .map((color, index) => ({
      color,
      index,
      rgb: resolve?.(color) ?? ([0, 0, 0] as const),
    }))
    .toSorted((a, b) => luminance(a.rgb) - luminance(b.rgb));

const stopsKey = (palette: DitherPalette, resolve: Resolve | null) =>
  resolve
    ? orderStops(palette, resolve)
        .map((stop) => rgbToHex(stop.rgb))
        .join(",")
    : "";

const parseStops = (key: string) => key.split(",").map(hexToRgb);

interface ToneCache {
  key: string;
  tones: Float32Array;
}

const sourceKey = (
  source: SourceSettings,
  image: LoadedImage | null,
  { cols, rows }: Grid
) =>
  source.kind === "image" && image
    ? `image:${image.id}:${cols}x${rows}`
    : `pattern:${source.pattern}:${source.angle}:${source.scale}:${source.seed}:${cols}x${rows}`;

interface Rendered {
  result: ImageData;
  /** The pattern's smooth tones on the palette, for compare. */
  before: ImageData | null;
}

/** Runs the pipeline on the frame after any input changes. */
const useDitherResult = ({
  source,
  image,
  grid,
  look,
  stops,
}: {
  source: SourceSettings;
  image: LoadedImage | null;
  grid: Grid;
  look: MakerLook;
  stops: string;
}) => {
  const [rendered, setRendered] = useState<Rendered | null>(null);
  const tonesRef = useRef<ToneCache | null>(null);
  const { cols, rows } = grid;
  const { method, tones: levels, contrast, brightness, invert } = look;
  const key = sourceKey(source, image, grid);
  const sourceRef = useRef({ image, source });
  sourceRef.current = { image, source };

  useEffect(() => {
    if (!stops) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const size = { cols, rows };
      let tones = tonesRef.current?.key === key ? tonesRef.current.tones : null;
      if (!tones) {
        tones = sourceTones(
          sourceRef.current.source,
          sourceRef.current.image,
          size
        );
        tonesRef.current = { key, tones };
      }
      const adjustments = { brightness, contrast, invert };
      const ramp = parseStops(stops);
      setRendered({
        before: key.startsWith("pattern")
          ? rampImage(tones, size, adjustments, ramp)
          : null,
        result: ditherTones(tones, size, {
          ...adjustments,
          levels,
          method,
          stops: ramp,
        }),
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [key, cols, rows, method, levels, contrast, brightness, invert, stops]);

  return rendered;
};

interface Thumbs {
  presets: ReadonlyMap<string, ImageData>;
  patterns: ReadonlyMap<MakerPattern, ImageData>;
  methods: ReadonlyMap<DitherMethod, ImageData>;
}

/**
 * Every preset, pattern and method thumbnail, drawn by the real engine on
 * the current source. Waits for the controls to settle for a moment so a
 * slider drag only redraws the main preview.
 */
const useThumbnails = ({
  source,
  image,
  grid,
  look,
  presets,
  resolve,
}: {
  source: SourceSettings;
  image: LoadedImage | null;
  grid: Grid;
  look: MakerLook;
  presets: readonly MakerPreset[];
  resolve: Resolve | null;
}) => {
  const [thumbs, setThumbs] = useState<Thumbs | null>(null);
  const key = sourceKey(source, image, grid);
  const lookKey = JSON.stringify(look);
  const latest = useRef({ image, look, presets, source });
  latest.current = { image, look, presets, source };

  useEffect(() => {
    if (!resolve) {
      return;
    }
    const timer = setTimeout(() => {
      const { current } = latest;
      const small = thumbGrid(grid, 72);
      const tones = sourceTones(current.source, current.image, small);
      const ditherLook = (
        target: MakerLook,
        values: Float32Array,
        size: Grid
      ) =>
        ditherTones(values, size, {
          brightness: target.brightness,
          contrast: target.contrast,
          invert: target.invert,
          levels: target.tones,
          method: target.method,
          stops: orderStops(target.palette, resolve).map((stop) => stop.rgb),
        });
      const patternGrid = { cols: 40, rows: 28 };
      const methodGrid = { cols: 56, rows: 10 };
      const ramp = rampTones(methodGrid);
      setThumbs({
        methods: new Map(
          DITHER_METHODS.map((method) => [
            method,
            ditherLook(
              {
                ...current.look,
                brightness: 0,
                contrast: 0,
                invert: false,
                method,
              },
              ramp,
              methodGrid
            ),
          ])
        ),
        patterns: new Map(
          PATTERNS.map((pattern) => [
            pattern,
            ditherLook(
              current.look,
              patternTones({ ...current.source, pattern }, patternGrid),
              patternGrid
            ),
          ])
        ),
        presets: new Map(
          current.presets.map((preset) => [
            preset.id,
            ditherLook(preset.look, tones, small),
          ])
        ),
      });
    }, 140);
    return () => clearTimeout(timer);
    // `grid` is read through its shape; `key` and `lookKey` stand for the rest.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lookKey, resolve, grid.cols, grid.rows, presets]);

  return thumbs;
};

/** The size of an element's content box. */
const useElementSize = (ref: RefObject<HTMLElement | null>) => {
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null
  );
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setSize({
          height: entry.contentRect.height,
          width: entry.contentRect.width,
        });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
};

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

const LABEL =
  "text-muted-foreground font-mono text-[10px] tracking-[0.08em] uppercase";

const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

/** Arrow keys move through a radio group and wrap at the ends. */
const onRadioKeys = <T extends string>({
  event,
  options,
  value,
  onChange,
}: {
  event: KeyboardEvent<HTMLElement>;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) => {
  const step = { ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1 }[
    event.key
  ];
  if (step === undefined) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const index = options.indexOf(value);
  const next = options.at((index + step) % options.length) ?? value;
  onChange(next);
  event.currentTarget
    .closest("[role=radiogroup]")
    ?.querySelector<HTMLElement>(`[data-value="${CSS.escape(next)}"]`)
    ?.focus();
};

/** Props every radio option needs for roving focus. */
const radioProps = <T extends string>({
  option,
  options,
  value,
  onChange,
}: {
  option: T;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) => ({
  "aria-checked": option === value,
  "data-value": option,
  onClick: () => onChange(option),
  onKeyDown: (event: KeyboardEvent<HTMLElement>) =>
    onRadioKeys({ event, onChange, options, value }),
  role: "radio" as const,
  tabIndex: option === value ? 0 : -1,
  type: "button" as const,
});

const Segmented = <T extends string>({
  label,
  options,
  value,
  onChange,
  render = String,
  className,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  render?: (option: T) => ReactNode;
  className?: string;
}) => (
  <div
    role="radiogroup"
    aria-label={label}
    className={cn("bg-muted/70 flex rounded-lg p-0.5", className)}
  >
    {options.map((option) => (
      <button
        key={option}
        {...radioProps({ onChange, option, options, value })}
        className={cn(
          FOCUS,
          "h-7 min-w-0 flex-1 truncate rounded-md px-2 font-mono text-[11px] transition-[color,background-color,box-shadow] duration-150 ease-out",
          option === value
            ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.2)]"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {render(option)}
      </button>
    ))}
  </div>
);

const RANGE = cn(
  "h-5 w-full cursor-pointer appearance-none bg-transparent outline-none",
  "[&::-webkit-slider-runnable-track]:h-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--dither-ink)_var(--fill),var(--muted)_var(--fill))]",
  "[&::-webkit-slider-thumb]:-mt-[5.5px] [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_var(--card)] [&::-webkit-slider-thumb]:transition-[scale] [&::-webkit-slider-thumb]:duration-150 active:[&::-webkit-slider-thumb]:scale-110",
  "focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_3px_var(--card),0_0_0_5px_var(--ring)]",
  "[&::-moz-range-track]:h-[3px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted [&::-moz-range-progress]:h-[3px] [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-dither-ink",
  "[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-foreground"
);

const Slider = ({
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
  // The webkit track paints the filled part from this custom property.
  const style: Record<string, string> = {
    "--fill": `${((value - min) / (max - min)) * 100}%`,
  };
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <span className="flex items-baseline justify-between gap-3">
        <span id={id} className={LABEL}>
          {label}
        </span>
        <span className="text-foreground font-mono text-[11px] tabular-nums">
          {format(value)}
        </span>
      </span>
      <input
        type="range"
        aria-labelledby={id}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        onKeyDown={(event) => event.stopPropagation()}
        className={RANGE}
        style={style}
      />
    </div>
  );
};

const Switch = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <span id={id} className={LABEL}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => onChange(!checked)}
        className={cn(
          FOCUS,
          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 ease-out",
          checked ? "bg-dither-ink" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "bg-foreground absolute top-0.5 left-0.5 size-4 rounded-full transition-[translate,background-color] duration-200 ease-(--ease-out) motion-reduce:transition-none",
            checked && "bg-background translate-x-4"
          )}
        />
      </button>
    </div>
  );
};

const signed = (value: number) => (value > 0 ? `+${value}` : String(value));

const ICON = "size-4 shrink-0";

const Glyph = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={cn(ICON, className)}
  >
    {children}
  </svg>
);

const SplitIcon = () => (
  <Glyph>
    <rect x="2" y="3" width="12" height="10" rx="1.5" />
    <path d="M8 1.5v13" />
  </Glyph>
);

const ExportIcon = () => (
  <Glyph>
    <path d="M8 10V2.5M5 5.25 8 2.25l3 3M3 9.5v2.75c0 .8.7 1.5 1.5 1.5h7c.8 0 1.5-.7 1.5-1.5V9.5" />
  </Glyph>
);

const ShuffleIcon = () => (
  <Glyph>
    <path d="M2 4.5h2.2c1.1 0 2.1.6 2.7 1.5l2.2 4c.6.9 1.6 1.5 2.7 1.5H14M2 11.5h2.2c1.1 0 2.1-.6 2.7-1.5M9.1 6c.6-.9 1.6-1.5 2.7-1.5H14M12 2.5l2 2-2 2M12 9.5l2 2-2 2" />
  </Glyph>
);

const PlusIcon = () => (
  <Glyph>
    <path d="M8 3.5v9M3.5 8h9" />
  </Glyph>
);

const CloseIcon = () => (
  <Glyph>
    <path d="m4.5 4.5 7 7m0-7-7 7" />
  </Glyph>
);

const ImageIcon = () => (
  <Glyph>
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
    <circle cx="10.5" cy="6" r="1.25" />
    <path d="m2.5 12 3.5-3.75L9 11l1.5-1.25L13.5 12" />
  </Glyph>
);

const IconButton = ({
  label,
  children,
  onClick,
  pressed,
  className,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  pressed?: boolean;
  className?: string;
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={pressed}
    onClick={onClick}
    className={cn(
      FOCUS,
      "text-muted-foreground hover:text-foreground hover:bg-muted/70 grid size-7 shrink-0 place-items-center rounded-md transition-[color,background-color,scale] duration-150 ease-out motion-safe:active:scale-[0.96]",
      pressed &&
        "bg-dither-ink/15 text-dither-ink hover:bg-dither-ink/20 hover:text-dither-ink",
      className
    )}
  >
    {children}
  </button>
);

/** Draws an ImageData one pixel per cell; CSS scales it without blur. */
const PixelCanvas = ({
  image,
  className,
  smooth = false,
  style,
}: {
  image: ImageData | null | undefined;
  className?: string;
  smooth?: boolean;
  style?: CSSProperties;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !image) {
      return;
    }
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext("2d")?.putImageData(image, 0, 0);
  }, [image]);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={style}
      className={cn(
        smooth ? undefined : "[image-rendering:pixelated]",
        image ? "opacity-100" : "opacity-0",
        "transition-opacity duration-200",
        className
      )}
    />
  );
};

/* ------------------------------------------------------------------ */
/* Stage                                                               */
/* ------------------------------------------------------------------ */

interface Box {
  width: number;
  height: number;
}

const ZOOMS = ["fit", "actual", "double"] as const;
const ZOOM_LABELS = {
  actual: "1:1",
  double: "2:1",
  fit: "Fit",
} as const satisfies Record<Zoom, string>;

// Room around the picture inside the stage.
const STAGE_PAD = 48;

/**
 * How big to draw the preview. Fit prefers a whole number of device
 * pixels per cell, so every cell is the same size and the pattern never
 * shimmers. 1:1 is the export's real pixels, one image pixel
 * per device pixel; 2:1 doubles that.
 */
const displaySize = ({
  box,
  cell,
  cells,
  zoom,
}: {
  box: Box;
  cell: number;
  cells: Box;
  zoom: Zoom;
}): Box => {
  const dpr = window.devicePixelRatio || 1;
  if (zoom !== "fit") {
    const perCell = (cell * (zoom === "double" ? 2 : 1)) / dpr;
    return { height: cells.height * perCell, width: cells.width * perCell };
  }
  const fit = Math.min(
    (box.width - STAGE_PAD) / cells.width,
    (box.height - STAGE_PAD) / cells.height
  );
  // Snap to whole device pixels per cell unless that wastes a quarter of
  // the stage; then use the room, as cells under two pixels blur anyway.
  const whole = Math.floor(fit * dpr) / dpr;
  const scale = whole >= 1 && whole >= fit * 0.75 ? whole : fit;
  return { height: cells.height * scale, width: cells.width * scale };
};

/** The uploaded picture, covering the output exactly as the dither does. */
const BeforeImage = ({
  image,
  width,
  height,
  className,
}: {
  image: LoadedImage;
  width: number;
  height: number;
  className?: string;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }
    canvas.width = width;
    canvas.height = height;
    const scale = Math.max(width / image.width, height / image.height);
    const sw = width / scale;
    const sh = height / scale;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image.element,
      (image.width - sw) / 2,
      (image.height - sh) / 2,
      sw,
      sh,
      0,
      0,
      width,
      height
    );
  }, [image, width, height]);
  return <canvas ref={ref} aria-hidden="true" className={className} />;
};

const Chip = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "bg-background/80 text-foreground pointer-events-none absolute top-2.5 rounded-md px-1.5 py-1 font-mono text-[10px] leading-none tracking-[0.08em] uppercase backdrop-blur-sm",
      className
    )}
  >
    {children}
  </span>
);

const splitKeys = (key: string, shift: boolean) => {
  const step = shift ? 0.1 : 0.02;
  return (
    {
      ArrowDown: -step,
      ArrowLeft: -step,
      ArrowRight: step,
      ArrowUp: step,
    }[key] ?? null
  );
};

/** The draggable divider between original and dither. */
const CompareHandle = ({
  split,
  onSplit,
}: {
  split: number;
  onSplit: (value: number) => void;
}) => (
  <div
    role="slider"
    tabIndex={0}
    aria-label="Compare original and dither"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(split * 100)}
    aria-valuetext={`${Math.round(split * 100)}% original`}
    onKeyDown={(event) => {
      const step = splitKeys(event.key, event.shiftKey);
      const jump = { End: 1, Home: 0 }[event.key];
      if (step === null && jump === undefined) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onSplit(clamp(jump ?? split + (step ?? 0), 0, 1));
    }}
    style={{ left: `${split * 100}%` }}
    className="group/handle absolute inset-y-0 z-10 -ml-px w-0.5 cursor-ew-resize outline-none"
  >
    <span className="bg-foreground absolute inset-y-0 left-0 w-0.5 shadow-[0_0_0_1px_rgb(0_0_0/0.35)]" />
    <span className="bg-foreground text-background group-focus-visible/handle:ring-ring/60 absolute top-1/2 left-px grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-[0_2px_10px_rgb(0_0_0/0.45)] group-focus-visible/handle:ring-4">
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="size-3.5"
        fill="currentColor"
      >
        <path d="M6 4 2 8l4 4zM10 4l4 4-4 4z" />
      </svg>
    </span>
  </div>
);

/** A file glyph built from cells, for the empty state. */
const DropArt = () => (
  <svg
    viewBox="0 0 24 18"
    aria-hidden="true"
    className="text-dither-ink h-12 w-16 [shape-rendering:crispEdges]"
  >
    <path
      fill="currentColor"
      opacity={0.35}
      d="M0 0h24v1H0zM0 17h24v1H0zM0 1h1v16H0zM23 1h1v16h-1z"
    />
    <path fill="currentColor" d="M16 3h3v3h-3zM3 15l5-6 3 3 3-4 7 7z" />
    <path
      fill="currentColor"
      opacity={0.45}
      d="M4 13h1v1H4zM6 13h1v1H6zM8 12h1v1H8zM10 13h1v1h-1zM12 12h1v1h-1zM14 11h1v1h-1zM16 12h1v1h-1zM18 13h1v1h-1z"
    />
  </svg>
);

const EmptyState = ({
  dragging,
  samples,
  onChooseFile,
  onSample,
}: {
  dragging: boolean;
  samples: readonly MakerSample[];
  onChooseFile: () => void;
  onSample: (sample: MakerSample) => void;
}) => (
  <div className="absolute inset-3 grid place-items-center">
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-x-0 bottom-0 h-3/4 rounded-b-[14px] transition-opacity duration-200",
        dragging ? "opacity-60" : "opacity-30"
      )}
      style={fillStyle("gradient", {
        edge: "bottom",
        from: 0.5,
        length: 40,
        to: 0,
      })}
    />
    <div
      className={cn(
        "relative grid size-full place-items-center rounded-[14px] border border-dashed p-6 text-center transition-[border-color,background-color] duration-150 ease-out",
        dragging ? "border-dither-ink bg-dither-ink/10" : "border-foreground/20"
      )}
    >
      <div className="grid max-w-72 justify-items-center gap-3">
        <DropArt />
        <p className="text-foreground text-[15px] font-medium text-balance">
          {dragging ? "Release to dither" : "Drop an image to dither it"}
        </p>
        <p className="text-muted-foreground text-[13px] text-pretty">
          PNG, JPEG or WebP. Paste works too. Nothing leaves your device.
        </p>
        <button
          type="button"
          onClick={onChooseFile}
          className={cn(
            FOCUS,
            "bg-dither-ink text-primary-foreground hover:bg-dither-ink/90 mt-1 inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-[background-color,scale] duration-150 ease-(--ease-out) motion-safe:active:scale-[0.96]"
          )}
        >
          <ImageIcon />
          Choose image
        </button>
        {samples.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 pt-1 text-[12px]">
            <span className="text-muted-foreground">or try</span>
            {samples.map((sample) => (
              <button
                key={sample.src}
                type="button"
                onClick={() => onSample(sample)}
                className={cn(
                  FOCUS,
                  "text-foreground decoration-foreground/30 hover:decoration-foreground rounded-sm underline underline-offset-4 transition-[text-decoration-color] duration-150"
                )}
              >
                {sample.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  </div>
);

interface StageView {
  zoom: Zoom;
  compare: boolean;
  split: number;
}

const useDragPan = (scrollRef: RefObject<HTMLDivElement | null>) => {
  const start = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      const scroller = scrollRef.current;
      if (!scroller || event.button !== 0) {
        return;
      }
      start.current = {
        left: scroller.scrollLeft,
        top: scroller.scrollTop,
        x: event.clientX,
        y: event.clientY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const scroller = scrollRef.current;
      const from = start.current;
      if (!scroller || !from) {
        return;
      }
      scroller.scrollLeft = from.left - (event.clientX - from.x);
      scroller.scrollTop = from.top - (event.clientY - from.y);
    },
    onPointerUp: () => {
      start.current = null;
    },
  };
};

const Picture = ({
  rendered,
  image,
  grid,
  size,
  view,
  onSplit,
  label,
}: {
  rendered: Rendered;
  image: LoadedImage | null;
  grid: Grid & Box;
  size: Box;
  view: StageView;
  onSplit: (value: number) => void;
  label: string;
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const splitAt = (clientX: number) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (rect) {
      onSplit(clamp((clientX - rect.left) / rect.width, 0, 1));
    }
  };
  const compareHandlers = view.compare
    ? {
        onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
          event.stopPropagation();
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          splitAt(event.clientX);
        },
        onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
          if (dragging.current) {
            splitAt(event.clientX);
          }
        },
        onPointerUp: () => {
          dragging.current = false;
        },
      }
    : {};
  const layer = "absolute inset-0 size-full";

  return (
    <div
      ref={boxRef}
      role="img"
      aria-label={label}
      style={{ height: size.height, width: size.width }}
      className={cn(
        "relative shrink-0 touch-none rounded-[2px] outline-1 -outline-offset-1 outline-white/10 select-none",
        view.compare && "cursor-ew-resize"
      )}
      {...compareHandlers}
    >
      <PixelCanvas
        image={rendered.result}
        // Below one device pixel per cell, nearest-neighbour makes moiré.
        smooth={size.width * (window.devicePixelRatio || 1) < grid.cols}
        className={layer}
      />
      {view.compare ? (
        <>
          <div
            className="absolute inset-0"
            style={{ clipPath: `inset(0 ${(1 - view.split) * 100}% 0 0)` }}
          >
            {image ? (
              <BeforeImage
                image={image}
                width={grid.width}
                height={grid.height}
                className={layer}
              />
            ) : (
              <PixelCanvas image={rendered.before} smooth className={layer} />
            )}
          </div>
          <Chip className="left-2.5">Original</Chip>
          <Chip className="right-2.5">Dither</Chip>
          <CompareHandle split={view.split} onSplit={onSplit} />
        </>
      ) : null}
    </div>
  );
};

const StageToolbar = ({
  view,
  onView,
  readout,
  disabled,
}: {
  view: StageView;
  onView: (patch: Partial<StageView>) => void;
  readout: string;
  disabled: boolean;
}) => (
  <div className="border-border/60 flex h-12 shrink-0 items-center gap-2 border-b px-3">
    <button
      type="button"
      aria-pressed={view.compare}
      disabled={disabled}
      onClick={() => onView({ compare: !view.compare })}
      className={cn(
        FOCUS,
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2 font-mono text-[11px] transition-[color,background-color,scale] duration-150 ease-out disabled:opacity-40 motion-safe:active:scale-[0.96]",
        view.compare
          ? "bg-dither-ink/15 text-dither-ink"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
      )}
    >
      <SplitIcon />
      Compare
    </button>
    <Segmented
      label="Zoom"
      options={ZOOMS}
      value={view.zoom}
      onChange={(zoom) => onView({ zoom })}
      render={(zoom) => ZOOM_LABELS[zoom]}
      className="w-36"
    />
    <span className="text-muted-foreground ml-auto hidden truncate font-mono text-[11px] tabular-nums @sm:block">
      {readout}
    </span>
  </div>
);

const Stage = ({
  rendered,
  image,
  empty,
  dragging,
  grid,
  cell,
  view,
  onView,
  samples,
  onChooseFile,
  onSample,
  status,
}: {
  rendered: Rendered | null;
  image: LoadedImage | null;
  empty: boolean;
  dragging: boolean;
  grid: Grid & Box;
  cell: number;
  view: StageView;
  onView: (patch: Partial<StageView>) => void;
  samples: readonly MakerSample[];
  onChooseFile: () => void;
  onSample: (sample: MakerSample) => void;
  status: string;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const box = useElementSize(scrollRef);
  const pan = useDragPan(scrollRef);
  const size =
    box && rendered && !empty
      ? displaySize({
          box,
          cell,
          cells: { height: grid.rows, width: grid.cols },
          zoom: view.zoom,
        })
      : null;
  const zoomed = view.zoom !== "fit";

  // Open a zoom on the middle of the picture, not its corner.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || !zoomed) {
      return;
    }
    scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) / 2;
    scroller.scrollTop = (scroller.scrollHeight - scroller.clientHeight) / 2;
  }, [zoomed, view.zoom]);

  return (
    <div className="flex min-w-0 flex-col">
      <StageToolbar
        view={view}
        onView={onView}
        disabled={empty}
        readout={`${grid.width} × ${grid.height} px · ${grid.cols} × ${grid.rows} cells`}
      />
      <div className="relative isolate">
        <div
          ref={scrollRef}
          {...(zoomed && !view.compare ? pan : {})}
          className={cn(
            "grid h-[clamp(17rem,62vw,24rem)] w-full min-w-0 [place-items:safe_center] overflow-auto overscroll-contain bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_14%,transparent)_1px,transparent_1px)] bg-size-[14px_14px] p-6 @3xl:h-[clamp(22rem,56vh,36rem)]",
            zoomed && !view.compare && "cursor-grab active:cursor-grabbing"
          )}
        >
          {rendered && size ? (
            <Picture
              rendered={rendered}
              image={image}
              grid={grid}
              size={size}
              view={view}
              onSplit={(split) => onView({ split })}
              label={`Dither preview, ${grid.cols} by ${grid.rows} cells`}
            />
          ) : null}
        </div>
        {empty ? (
          <EmptyState
            dragging={dragging}
            samples={samples}
            onChooseFile={onChooseFile}
            onSample={onSample}
          />
        ) : (
          <div
            aria-hidden="true"
            className={cn(
              "bg-background/70 ring-dither-ink pointer-events-none absolute inset-3 grid place-items-center rounded-[14px] text-sm font-medium ring-2 backdrop-blur-[2px] transition-opacity duration-150 ring-inset",
              dragging ? "opacity-100" : "opacity-0"
            )}
          >
            Release to dither
          </div>
        )}
        <p
          role="status"
          className={cn(
            "bg-background/85 text-foreground pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-md px-2 py-1 font-mono text-[11px] backdrop-blur-sm transition-opacity duration-200",
            status ? "opacity-100" : "opacity-0"
          )}
        >
          {status}
        </p>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Presets                                                             */
/* ------------------------------------------------------------------ */

const sameLook = (a: MakerLook, b: MakerLook) =>
  a.method === b.method &&
  a.cell === b.cell &&
  a.tones === b.tones &&
  a.contrast === b.contrast &&
  a.brightness === b.brightness &&
  a.invert === b.invert &&
  a.palette.length === b.palette.length &&
  a.palette.every((color, index) => color === b.palette[index]);

const PresetStrip = ({
  presets,
  activeId,
  thumbs,
  onPick,
}: {
  presets: readonly MakerPreset[];
  activeId: string | undefined;
  thumbs: Thumbs | null;
  onPick: (preset: MakerPreset) => void;
}) => (
  <div className="border-border/60 flex min-w-0 flex-col gap-2.5 border-t px-3 pt-3 pb-3.5">
    <div className="flex items-baseline justify-between px-1">
      <span id="dither-maker-looks" className={LABEL}>
        Looks
      </span>
      <span className="text-muted-foreground text-[11px]">
        {activeId ? "" : "Custom"}
      </span>
    </div>
    <div
      role="group"
      aria-labelledby="dither-maker-looks"
      className="no-scrollbar -mx-3 flex snap-x scroll-px-3 gap-2 overflow-x-auto px-3 pb-0.5"
    >
      {presets.map((preset) => {
        const active = preset.id === activeId;
        return (
          <button
            key={preset.id}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(preset)}
            className={cn(
              FOCUS,
              "group/look flex w-[6.75rem] shrink-0 snap-start flex-col gap-1.5 rounded-xl p-1 text-left transition-[background-color,box-shadow,scale] duration-150 ease-out motion-safe:active:scale-[0.96]",
              active
                ? "bg-dither-ink/12 ring-dither-ink ring-1"
                : "hover:bg-muted/60"
            )}
          >
            <span className="bg-background relative block aspect-[16/10] w-full overflow-hidden rounded-[9px] outline-1 -outline-offset-1 outline-white/10">
              <PixelCanvas
                image={thumbs?.presets.get(preset.id)}
                className="size-full object-cover"
              />
            </span>
            <span className="flex items-center justify-between gap-1 px-1 pb-0.5">
              <span
                className={cn(
                  "truncate text-[12px]",
                  active
                    ? "text-foreground font-medium"
                    : "text-muted-foreground group-hover/look:text-foreground"
                )}
              >
                {preset.name}
              </span>
              <span className="flex shrink-0 -space-x-1">
                {preset.look.palette.map((color) => (
                  <span
                    key={color}
                    className="ring-card size-2 rounded-full ring-1"
                    style={{ background: cssColor(color) }}
                  />
                ))}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Inspector                                                           */
/* ------------------------------------------------------------------ */

const Section = ({
  id,
  title,
  action,
  hidden,
  children,
}: {
  id: InspectorTab;
  title: string;
  action?: ReactNode;
  hidden: boolean;
  children: ReactNode;
}) => (
  <section
    aria-labelledby={`dither-maker-${id}`}
    className={cn(
      "border-border/60 flex-col gap-4 px-4 pt-4 pb-5 @3xl:flex @3xl:border-b",
      hidden ? "hidden" : "flex"
    )}
  >
    <div className="flex h-5 items-center justify-between gap-2">
      <h3
        id={`dither-maker-${id}`}
        className="text-foreground font-mono text-[11px] tracking-[0.08em] uppercase"
      >
        {title}
      </h3>
      {action}
    </div>
    {children}
  </section>
);

const ThumbOption = ({
  selected,
  label,
  image,
  className,
  ...radio
}: ReturnType<typeof radioProps> & {
  selected: boolean;
  label: string;
  image: ImageData | undefined;
  className?: string;
}) => (
  <button
    {...radio}
    className={cn(
      FOCUS,
      "flex min-w-0 flex-col gap-1 rounded-lg p-1 transition-[background-color,box-shadow] duration-150 ease-out",
      selected
        ? "bg-dither-ink/12 ring-dither-ink ring-1"
        : "hover:bg-muted/60",
      className
    )}
  >
    <span className="bg-background block w-full overflow-hidden rounded-[5px] outline-1 -outline-offset-1 outline-white/10">
      <PixelCanvas image={image} className="block h-auto w-full" />
    </span>
    <span
      className={cn(
        "truncate px-0.5 text-left font-mono text-[10.5px]",
        selected ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {label}
    </span>
  </button>
);

const PatternControls = ({
  source,
  onChange,
}: {
  source: SourceSettings;
  onChange: (patch: Partial<SourceSettings>) => void;
}) => {
  switch (source.pattern) {
    case "orb":
    case "linear": {
      return (
        <Slider
          label={source.pattern === "orb" ? "Light" : "Angle"}
          value={source.angle}
          min={0}
          max={355}
          step={5}
          format={(value) => `${value}°`}
          onChange={(angle) => onChange({ angle })}
        />
      );
    }
    case "radial": {
      return (
        <Slider
          label="Spread"
          value={source.scale}
          min={1}
          max={10}
          onChange={(scale) => onChange({ scale })}
        />
      );
    }
    case "noise": {
      return (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Slider
              label="Scale"
              value={source.scale}
              min={1}
              max={10}
              onChange={(scale) => onChange({ scale })}
            />
          </div>
          <IconButton
            label="New noise"
            onClick={() =>
              onChange({ seed: 1 + Math.floor(Math.random() * 9999) })
            }
          >
            <ShuffleIcon />
          </IconButton>
        </div>
      );
    }
    default: {
      const exhaustive: never = source.pattern;
      return exhaustive;
    }
  }
};

const ImageCard = ({
  image,
  onReplace,
  onRemove,
}: {
  image: LoadedImage;
  onReplace: () => void;
  onRemove: () => void;
}) => (
  <div className="bg-background/60 ring-border/60 flex items-center gap-2.5 rounded-xl p-2 ring-1 ring-inset">
    <BeforeImage
      image={image}
      width={80}
      height={80}
      className="size-10 shrink-0 rounded-md outline-1 -outline-offset-1 outline-white/10"
    />
    <div className="min-w-0 flex-1">
      <p className="text-foreground truncate text-[13px]">{image.name}</p>
      <p className="text-muted-foreground font-mono text-[11px] whitespace-nowrap tabular-nums">
        {image.width} × {image.height}
      </p>
    </div>
    <IconButton label="Replace image" onClick={onReplace}>
      <ImageIcon />
    </IconButton>
    <IconButton label="Remove image" onClick={onRemove}>
      <CloseIcon />
    </IconButton>
  </div>
);

const SourceBody = ({
  source,
  image,
  thumbs,
  onChange,
  onChooseFile,
  onRemoveImage,
}: {
  source: SourceSettings;
  image: LoadedImage | null;
  thumbs: Thumbs | null;
  onChange: (patch: Partial<SourceSettings>) => void;
  onChooseFile: () => void;
  onRemoveImage: () => void;
}) => {
  if (source.kind === "image" && image) {
    return (
      <ImageCard
        image={image}
        onReplace={onChooseFile}
        onRemove={onRemoveImage}
      />
    );
  }
  if (source.kind === "image") {
    return (
      <button
        type="button"
        onClick={onChooseFile}
        className={cn(
          FOCUS,
          "border-foreground/20 hover:border-dither-ink hover:text-foreground text-muted-foreground flex h-16 items-center justify-center gap-2 rounded-xl border border-dashed text-[13px] transition-[border-color,color] duration-150"
        )}
      >
        <ImageIcon />
        Choose an image
      </button>
    );
  }
  return (
    <>
      <div
        role="radiogroup"
        aria-label="Pattern"
        className="grid grid-cols-4 gap-1"
      >
        {PATTERNS.map((pattern) => (
          <ThumbOption
            key={pattern}
            {...radioProps({
              onChange: (next) => onChange({ pattern: next }),
              option: pattern,
              options: PATTERNS,
              value: source.pattern,
            })}
            selected={pattern === source.pattern}
            label={PATTERN_LABELS[pattern]}
            image={thumbs?.patterns.get(pattern)}
          />
        ))}
      </div>
      <PatternControls source={source} onChange={onChange} />
    </>
  );
};

const SOURCE_KINDS = ["pattern", "image"] as const;

const SourceSection = ({
  hidden,
  source,
  image,
  thumbs,
  onChange,
  onChooseFile,
  onRemoveImage,
}: {
  hidden: boolean;
  source: SourceSettings;
  image: LoadedImage | null;
  thumbs: Thumbs | null;
  onChange: (patch: Partial<SourceSettings>) => void;
  onChooseFile: () => void;
  onRemoveImage: () => void;
}) => (
  <Section id="source" title="Source" hidden={hidden}>
    <Segmented
      label="Source"
      options={SOURCE_KINDS}
      value={source.kind}
      onChange={(kind) => onChange({ kind })}
      render={(kind) => (kind === "pattern" ? "Pattern" : "Image")}
    />
    <SourceBody
      source={source}
      image={image}
      thumbs={thumbs}
      onChange={onChange}
      onChooseFile={onChooseFile}
      onRemoveImage={onRemoveImage}
    />
  </Section>
);

const DitherSection = ({
  hidden,
  look,
  thumbs,
  onChange,
}: {
  hidden: boolean;
  look: MakerLook;
  thumbs: Thumbs | null;
  onChange: (patch: Partial<MakerLook>) => void;
}) => (
  <Section id="pattern" title="Pattern" hidden={hidden}>
    <div className="flex flex-col gap-2">
      <div
        role="radiogroup"
        aria-label="Method"
        className="grid grid-cols-3 gap-1"
      >
        {DITHER_METHODS.map((method) => (
          <ThumbOption
            key={method}
            {...radioProps({
              onChange: (next) => onChange({ method: next }),
              option: method,
              options: DITHER_METHODS,
              value: look.method,
            })}
            selected={method === look.method}
            label={METHOD_LABELS[method]}
            image={thumbs?.methods.get(method)}
          />
        ))}
      </div>
      <p className="text-muted-foreground min-h-8 text-[12px] leading-snug text-pretty">
        {METHOD_NOTES[look.method]}
      </p>
    </div>
    <Slider
      label="Cell"
      value={look.cell}
      min={1}
      max={16}
      format={(value) => `${value}px`}
      onChange={(cell) => onChange({ cell })}
    />
    <Slider
      label="Contrast"
      value={look.contrast}
      min={-100}
      max={100}
      step={5}
      format={signed}
      onChange={(contrast) => onChange({ contrast })}
    />
    <Slider
      label="Brightness"
      value={look.brightness}
      min={-100}
      max={100}
      step={5}
      format={signed}
      onChange={(brightness) => onChange({ brightness })}
    />
    <Switch
      label="Invert"
      checked={look.invert}
      onChange={(invert) => onChange({ invert })}
    />
  </Section>
);

const isHex = (value: string): value is HexColor =>
  /^#[0-9a-f]{6}$/i.test(value);

const CustomSwatch = ({
  value,
  onChange,
}: {
  value: DitherColor;
  onChange: (color: HexColor) => void;
}) => {
  const custom =
    isHex(value) && !STOP_SWATCHES.some((swatch) => swatch === value);
  return (
    <label
      title="Custom colour"
      className={cn(
        "has-focus-visible:ring-ring/60 relative grid size-7 cursor-pointer place-items-center rounded-full transition-[box-shadow] duration-150 has-focus-visible:ring-2",
        custom ? "ring-foreground/80 ring-1" : "hover:ring-border hover:ring-1"
      )}
    >
      <span
        className="size-4 rounded-full"
        style={{
          background: custom
            ? value
            : "conic-gradient(oklch(0.7 0.18 0), oklch(0.75 0.16 90), oklch(0.72 0.15 180), oklch(0.66 0.18 270), oklch(0.7 0.18 360))",
        }}
      />
      <input
        type="color"
        aria-label="Custom colour"
        value={isHex(value) ? value : "#3d6bff"}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const next = event.currentTarget.value;
          if (isHex(next)) {
            onChange(next);
          }
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
};

const PaletteRamp = ({
  look,
  selected,
  resolve,
  onSelect,
  onChange,
}: {
  look: MakerLook;
  selected: number;
  resolve: Resolve | null;
  onSelect: (index: number) => void;
  onChange: (patch: Partial<MakerLook>) => void;
}) => {
  const ordered = orderStops(look.palette, resolve);
  const canAdd = look.palette.length < 4;
  const canRemove = look.palette.length > 2;
  const add = () => {
    if (!canAdd) {
      return;
    }
    const palette: DitherPalette = [...look.palette, "grey"];
    onChange({ palette, tones: Math.max(look.tones, palette.length) });
    onSelect(palette.length - 1);
  };
  const remove = () => {
    const rest = look.palette.filter((_, index) => index !== selected);
    const [first, second, ...others] = rest;
    if (!canRemove || first === undefined || second === undefined) {
      return;
    }
    onChange({ palette: [first, second, ...others] });
    onSelect(0);
  };
  return (
    <div className="flex items-center gap-1.5">
      <div
        role="radiogroup"
        aria-label="Palette stops, dark to light"
        className="ring-border/60 flex h-9 min-w-0 flex-1 overflow-hidden rounded-lg ring-1"
      >
        {ordered.map((stop, position) => (
          <button
            key={stop.index}
            {...radioProps({
              onChange: (next) => onSelect(Number(next)),
              option: String(stop.index),
              options: ordered.map((item) => String(item.index)),
              value: String(selected),
            })}
            aria-label={`Stop ${position + 1}: ${swatchName(stop.color)}`}
            style={{ background: cssColor(stop.color) }}
            className={cn(
              "relative min-w-0 flex-1 outline-none transition-[flex-grow] duration-200 ease-(--ease-out) focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none",
              stop.index === selected && "grow-[1.6]"
            )}
          >
            {stop.index === selected ? (
              <span className="absolute inset-x-0 bottom-1 mx-auto h-1 w-4 rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.5)]" />
            ) : null}
          </button>
        ))}
      </div>
      <IconButton
        label="Add a stop"
        onClick={add}
        className={cn(!canAdd && "pointer-events-none opacity-30")}
      >
        <PlusIcon />
      </IconButton>
      <IconButton
        label="Remove the selected stop"
        onClick={remove}
        className={cn(!canRemove && "pointer-events-none opacity-30")}
      >
        <CloseIcon />
      </IconButton>
    </div>
  );
};

const ColourSection = ({
  hidden,
  look,
  selected,
  resolve,
  onSelect,
  onChange,
}: {
  hidden: boolean;
  look: MakerLook;
  selected: number;
  resolve: Resolve | null;
  onSelect: (index: number) => void;
  onChange: (patch: Partial<MakerLook>) => void;
}) => {
  const current = look.palette[selected] ?? look.palette[0];
  const setStop = (color: DitherColor) => {
    const [first, second, ...rest] = look.palette.map((stop, index) =>
      index === selected ? color : stop
    );
    if (first !== undefined && second !== undefined) {
      onChange({ palette: [first, second, ...rest] });
    }
  };
  return (
    <Section id="colour" title="Colour" hidden={hidden}>
      <PaletteRamp
        look={look}
        selected={selected}
        resolve={resolve}
        onSelect={onSelect}
        onChange={onChange}
      />
      <div className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between">
          <span className={LABEL}>Stop colour</span>
          <span className="text-foreground font-mono text-[11px]">
            {swatchName(current)}
          </span>
        </span>
        <div
          role="radiogroup"
          aria-label="Stop colour"
          className="flex flex-wrap gap-0.5"
        >
          {STOP_SWATCHES.map((swatch) => (
            <button
              key={swatch}
              {...radioProps<string>({
                onChange: setStop,
                option: swatch,
                options: STOP_SWATCHES,
                value: current,
              })}
              aria-label={swatchName(swatch)}
              title={swatchName(swatch)}
              className={cn(
                FOCUS,
                "grid size-7 place-items-center rounded-full transition-[box-shadow] duration-150 ease-out",
                swatch === current
                  ? "ring-foreground/80 ring-1"
                  : "hover:ring-border hover:ring-1"
              )}
            >
              <span
                className="size-4 rounded-full shadow-[inset_0_0_0_1px_rgb(128_128_128/0.35)]"
                style={{ background: cssColor(swatch) }}
              />
            </button>
          ))}
          <CustomSwatch value={current} onChange={setStop} />
        </div>
      </div>
      <Slider
        label="Tones"
        value={look.tones}
        min={2}
        max={8}
        onChange={(tones) => onChange({ tones })}
      />
    </Section>
  );
};

const OutputSection = ({
  hidden,
  size,
  hasImage,
  grid,
  onSize,
}: {
  hidden: boolean;
  size: SizeKey;
  hasImage: boolean;
  grid: Grid & Box;
  onSize: (size: SizeKey) => void;
}) => {
  const options: readonly SizeKey[] = hasImage
    ? [...SIZE_KEYS, "original"]
    : SIZE_KEYS;
  return (
    <Section id="output" title="Output" hidden={hidden}>
      <Segmented
        label="Shape"
        options={options}
        value={options.includes(size) ? size : "landscape"}
        onChange={onSize}
        render={(key) => (key === "original" ? "Image" : SIZES[key].label)}
      />
      <dl className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5">
          <dt className={LABEL}>Pixels</dt>
          <dd className="text-foreground font-mono text-[12px] tabular-nums">
            {grid.width} × {grid.height}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className={LABEL}>Cells</dt>
          <dd className="text-foreground font-mono text-[12px] tabular-nums">
            {grid.cols} × {grid.rows}
          </dd>
        </div>
      </dl>
    </Section>
  );
};

const ExportPopover = ({
  result,
  cell,
  method,
  filename,
  onStatus,
}: {
  result: ImageData | null;
  cell: number;
  method: DitherMethod;
  filename: string;
  onStatus: (status: string) => void;
}) => (
  <Popover>
    <PopoverTrigger
      disabled={!result}
      className={cn(
        FOCUS,
        "bg-dither-ink text-primary-foreground hover:bg-dither-ink/90 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium transition-[background-color,scale,opacity] duration-150 ease-(--ease-out) disabled:opacity-45 motion-safe:active:scale-[0.96]"
      )}
    >
      <ExportIcon />
      Export
    </PopoverTrigger>
    <PopoverContent
      side="top"
      align="end"
      sideOffset={10}
      collisionPadding={12}
      onKeyDown={(event) => event.stopPropagation()}
      className="w-[min(23rem,calc(100vw-1.5rem))] rounded-[20px] border-0 p-4 shadow-[0_24px_60px_-12px_rgb(0_0_0/0.6),0_0_0_1px_var(--border)]"
    >
      <DitherExportPanel
        image={result}
        cell={cell}
        matrix={tileMatrix(method)}
        filename={filename}
        onExport={({ action, filename: name }) =>
          onStatus(`${action === "copy" ? "Copied" : "Saved"} ${name}`)
        }
      />
    </PopoverContent>
  </Popover>
);

const TABS = ["source", "pattern", "colour", "output"] as const;
const TAB_LABELS = {
  colour: "Colour",
  output: "Output",
  pattern: "Pattern",
  source: "Source",
} as const satisfies Record<InspectorTab, string>;

/** A message under the canvas that clears itself after a few seconds. */
const useStatus = () => {
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    []
  );
  const show = useCallback((message: string) => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    setStatus(message);
    timer.current = setTimeout(() => setStatus(""), 3200);
  }, []);
  return [status, show] as const;
};

const firstFile = (list: FileList | null | undefined) =>
  [...(list ?? [])].find((file) => file.type.startsWith("image/"));

/**
 * A dither studio: start from a generated pattern or drop in an image,
 * pick a look, tune method, cell, tone and palette, compare against the
 * original, and export PNG, SVG or CSS. Everything runs in the browser.
 */
export const DitherMaker = ({
  defaultImage,
  defaultPattern = "orb",
  presets = MAKER_PRESETS,
  defaultPreset,
  samples = [],
  filename = "dither",
  className,
  ...props
}: DitherMakerProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const startPreset =
    presets.find((preset) => preset.id === defaultPreset) ??
    presets[0] ??
    MAKER_PRESETS[0];

  const [source, setSource] = useState<SourceSettings>(() => ({
    angle: defaultPattern === "linear" ? 160 : 315,
    kind: defaultImage ? "image" : "pattern",
    pattern: defaultPattern,
    scale: 4,
    seed: 7,
  }));
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [look, setLook] = useState<MakerLook>(startPreset.look);
  const [size, setSize] = useState<SizeKey>("landscape");
  const [view, setView] = useState<StageView>({
    compare: false,
    split: 0.5,
    zoom: "fit",
  });
  const [stop, setStop] = useState(look.palette.length - 1);
  const [tab, setTab] = useState<InspectorTab>("source");
  const [dragging, setDragging] = useState(false);
  const [status, showStatus] = useStatus();

  const patchSource = (patch: Partial<SourceSettings>) =>
    setSource((current) => ({ ...current, ...patch }));
  const patchLook = (patch: Partial<MakerLook>) =>
    setLook((current) => ({ ...current, ...patch }));
  const patchView = (patch: Partial<StageView>) =>
    setView((current) => ({ ...current, ...patch }));

  const adoptImage = useCallback((loaded: LoadedImage) => {
    setImage(loaded);
    setSource((current) => ({ ...current, kind: "image" }));
    setSize("original");
  }, []);

  useDefaultImage({
    onError: () => {
      showStatus("The starting image could not be loaded.");
      patchSource({ kind: "pattern" });
    },
    onLoad: adoptImage,
    src: defaultImage,
  });

  const loadFile = useCallback(
    async (file: File | undefined) => {
      if (!file) {
        showStatus("That is not an image. Try a PNG, JPEG or WebP.");
        return;
      }
      try {
        const loaded = await imageFromFile(file);
        adoptImage(loaded);
        showStatus(`Loaded ${loaded.name}, ${loaded.width} × ${loaded.height}`);
      } catch {
        showStatus(`${file.name} could not be read.`);
      }
    },
    [showStatus, adoptImage]
  );

  const loadSample = async (sample: MakerSample) => {
    try {
      adoptImage(await imageFromUrl(sample.src));
    } catch {
      showStatus(`${sample.name} could not be loaded.`);
    }
  };

  const showImage = source.kind === "image" && image !== null;
  const empty = source.kind === "image" && !image;
  const grid = gridFor(
    size === "original" && !showImage ? "landscape" : size,
    showImage ? image : null,
    look.cell
  );
  const resolve = useColorResolver(rootRef);
  const stops = stopsKey(look.palette, resolve);
  const rendered = useDitherResult({
    grid,
    image: showImage ? image : null,
    look,
    source,
    stops,
  });
  const thumbs = useThumbnails({
    grid,
    image: showImage ? image : null,
    look,
    presets,
    resolve,
    source,
  });
  const activeId = presets.find((preset) => sameLook(preset.look, look))?.id;
  const result = empty ? null : (rendered?.result ?? null);

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes("Files")) {
      event.preventDefault();
      setDragging(true);
    }
  };
  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (!(next instanceof Node && event.currentTarget.contains(next))) {
      setDragging(false);
    }
  };

  return (
    <div
      ref={rootRef}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        loadFile(firstFile(event.dataTransfer.files));
      }}
      onPaste={(event) => {
        const file = firstFile(event.clipboardData.files);
        if (file) {
          event.preventDefault();
          loadFile(file);
        }
      }}
      className={cn("@container w-full min-w-0", className)}
      {...props}
    >
      <div className="bg-card ring-border/60 relative overflow-hidden rounded-[20px] ring-1 @3xl:grid @3xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="border-border/60 flex min-w-0 flex-col @3xl:border-r">
          <Stage
            rendered={rendered}
            image={showImage ? image : null}
            empty={empty}
            dragging={dragging}
            grid={grid}
            cell={look.cell}
            view={view}
            onView={patchView}
            samples={samples}
            onChooseFile={() => fileRef.current?.click()}
            onSample={loadSample}
            status={status}
          />
          <PresetStrip
            presets={presets}
            activeId={activeId}
            thumbs={thumbs}
            onPick={(preset) => {
              setLook(preset.look);
              setStop(preset.look.palette.length - 1);
            }}
          />
        </div>

        <div className="border-border/60 relative flex min-w-0 flex-col border-t @3xl:border-t-0">
          <div className="border-border/60 border-b p-3 @3xl:hidden">
            <Segmented
              label="Controls"
              options={TABS}
              value={tab}
              onChange={setTab}
              render={(option) => TAB_LABELS[option]}
            />
          </div>
          <div className="flex min-h-0 flex-col @3xl:absolute @3xl:inset-0">
            <div className="no-scrollbar min-h-0 flex-1 @3xl:overflow-y-auto">
              <SourceSection
                hidden={tab !== "source"}
                source={source}
                image={image}
                thumbs={thumbs}
                onChange={patchSource}
                onChooseFile={() => fileRef.current?.click()}
                onRemoveImage={() => {
                  setImage(null);
                  setSize("landscape");
                }}
              />
              <DitherSection
                hidden={tab !== "pattern"}
                look={look}
                thumbs={thumbs}
                onChange={patchLook}
              />
              <ColourSection
                hidden={tab !== "colour"}
                look={look}
                selected={Math.min(stop, look.palette.length - 1)}
                resolve={resolve}
                onSelect={setStop}
                onChange={patchLook}
              />
              <OutputSection
                hidden={tab !== "output"}
                size={size}
                hasImage={showImage}
                grid={grid}
                onSize={setSize}
              />
            </div>
            <div className="border-border/60 bg-card shrink-0 border-t p-3">
              <ExportPopover
                result={result}
                cell={look.cell}
                method={look.method}
                filename={filename}
                onStatus={showStatus}
              />
            </div>
          </div>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          loadFile(firstFile(event.currentTarget.files));
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
};
