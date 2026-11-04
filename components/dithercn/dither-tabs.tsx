"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ComponentProps, CSSProperties, Ref, RefObject } from "react";

import {
  bloomStyle,
  cssColor,
  fillStyle,
  isInked,
  useDitherColors,
  usePrefersReducedMotion,
} from "@/lib/dither";
import type { Bloom, DitherColor, DitherMatrix, Rgba } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * The indicator is one canvas behind the triggers, one canvas pixel per
 * cell, redrawn only while it moves. Each frame works out a tone for every
 * cell and inks the cell where the tone beats the matrix threshold, so a
 * tone that falls switches cells off in Bayer order rather than fading.
 *
 * A move is three shapes at once. A ghost of the old tab thins out in
 * place. A body glides from the old tab to the new one: its leading edge
 * runs ahead of its trailing edge, so it stretches, and its tone falls
 * from the leading edge back to the trailing one, so it trails off like a
 * comet. A ghost of the new tab fills in under it. The three meet as one
 * solid shape on the new tab.
 *
 * The pill is lit like Dither Button: the full colour, a highlight dithered
 * down from the top and a shade dithered up from the bottom, with the
 * label's band kept clear. The underline is a bar whose ends fade through
 * the levels, under a sparse glow that rises towards the label.
 *
 * Trigger boxes are measured, not assumed, and re-measured when anything
 * in the list resizes or a web font finishes loading. Before the first
 * draw (and without JavaScript) the active trigger gets a flat CSS
 * version of the indicator.
 */

export type DitherTabsVariant = "pill" | "underline";

type Orientation = "horizontal" | "vertical";

interface TabsLook {
  variant: DitherTabsVariant;
  color: DitherColor;
  cell: number;
  bloom: Bloom;
  matrix: DitherMatrix;
  orientation: Orientation;
  /** The selected value, or undefined when nothing is selected. */
  value: string | undefined;
  /** True when the last change of tab came from the keyboard. */
  keyboard: RefObject<boolean>;
}

const TabsLookContext = createContext<TabsLook | null>(null);

const useTabsLook = (part: string): TabsLook => {
  const look = use(TabsLookContext);
  if (!look) {
    throw new Error(`${part} must be used inside <DitherTabs>.`);
  }
  return look;
};

// How long a move takes, in milliseconds.
const DURATION = 260;
// Pill corner radius and the underline's bar thickness and glow height.
const PILL_RADIUS = 8;
const BAR_CELLS = 2;
const GLOW_SHARE = 0.32;
const GLOW_PEAK = 0.36;

/** A trigger's box in CSS pixels, relative to the list's padding edge. */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Glide {
  /** Where the body started: the old tab, or wherever an interrupted move had got to. */
  from: Box;
  /** The value moved to. Its box is read live, so a resize mid-move lands right. */
  to: string;
  start: number;
}

interface Scene {
  body: Box;
  /** Unit vector of the move; zero at rest. */
  dir: readonly [number, number];
  /** Tone at the trailing end of the body; 1 at rest. */
  trail: number;
  ghosts: readonly { box: Box; tone: number }[];
}

interface Geometry {
  boxes: Map<string, Box>;
  width: number;
  height: number;
}

interface Grid {
  cols: number;
  rows: number;
  /** One cell in CSS pixels, snapped to whole device pixels. */
  size: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (value: number) => 1 - (1 - clamp01(value)) ** 4;
const easeInOut = (value: number) => {
  const x = clamp01(value);
  return x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2;
};
const smooth = (edge0: number, edge1: number, value: number) => {
  const x = clamp01((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * One edge of the body. An edge facing the move runs ahead; the edge
 * behind it lags, so the body stretches and then catches up.
 */
const edgeProgress = (facing: number, progress: number) => {
  if (facing > 0) {
    return easeOut(progress / 0.78);
  }
  if (facing < 0) {
    return easeOut((progress - 0.14) / 0.86);
  }
  return easeOut(progress);
};

const centre = (box: Box): readonly [number, number] => [
  box.x + box.w / 2,
  box.y + box.h / 2,
];

/** The scene a move shows at `progress`, 0 to 1. */
const glideScene = (from: Box, to: Box, progress: number): Scene => {
  const [fx, fy] = centre(from);
  const [tx, ty] = centre(to);
  const length = Math.hypot(tx - fx, ty - fy);
  const dir: readonly [number, number] =
    length < 0.5 ? [0, 0] : [(tx - fx) / length, (ty - fy) / length];
  const left = lerp(from.x, to.x, edgeProgress(-dir[0], progress));
  const right = lerp(
    from.x + from.w,
    to.x + to.w,
    edgeProgress(dir[0], progress)
  );
  const top = lerp(from.y, to.y, edgeProgress(-dir[1], progress));
  const bottom = lerp(
    from.y + from.h,
    to.y + to.h,
    edgeProgress(dir[1], progress)
  );
  return {
    body: { h: bottom - top, w: right - left, x: left, y: top },
    dir,
    ghosts: [
      { box: from, tone: 1 - easeOut(progress / 0.5) },
      { box: to, tone: easeInOut((progress - 0.3) / 0.7) },
    ],
    trail: 1 - 0.85 * Math.sin(Math.PI * clamp01(progress)) ** 0.7,
  };
};

const EMPTY_BOX: Box = { h: 0, w: 0, x: 0, y: 0 };

const restScene = (box: Box): Scene => ({
  body: box,
  dir: [0, 0],
  ghosts: [],
  trail: 1,
});

/** Ink colours, by index into the resolved list: base, light, dark. */
const BASE = 0;
const LIGHT = 1;
const DARK = 2;

/** Tone and colour of one shape at a point, in CSS pixels. */
interface Sample {
  tone: number;
  ink: number;
}

const NONE: Sample = { ink: BASE, tone: 0 };

/**
 * How much of a cell a rounded box covers, from the signed distance to its
 * edge: 1 a half cell inside, 0 a half cell outside. Straight edges land on
 * whole cells; the corners come out as partial tones, so they dither.
 */
const roundedCoverage = (
  box: Box,
  px: number,
  py: number,
  radius: number,
  size: number
) => {
  const r = Math.min(radius, box.w / 2, box.h / 2);
  const qx = Math.abs(px - (box.x + box.w / 2)) - (box.w / 2 - r);
  const qy = Math.abs(py - (box.y + box.h / 2)) - (box.h / 2 - r);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const distance = outside + Math.min(Math.max(qx, qy), 0) - r;
  return clamp01(0.5 - distance / size);
};

interface ShapeContext {
  /** Cell coordinates, for thresholds. */
  cx: number;
  cy: number;
  /** Cell size in CSS pixels. */
  size: number;
  matrix: DitherMatrix;
  vertical: boolean;
}

/**
 * The pill: inside the rounded box, full tone. The bevel picks the colour:
 * light dithered down from the top, dark dithered up from the bottom, and
 * the middle band (where the label sits) the plain colour.
 */
const pillSample = (
  box: Box,
  px: number,
  py: number,
  { cx, cy, size, matrix }: ShapeContext
): Sample => {
  if (box.w <= 0 || box.h <= 0) {
    return NONE;
  }
  const cover = roundedCoverage(box, px, py, PILL_RADIUS, size);
  if (cover <= 0) {
    return NONE;
  }
  const fromTop = (py - box.y) / box.h;
  if (fromTop > 0.34 && fromTop < 0.66) {
    return { ink: BASE, tone: cover };
  }
  const rows = box.h / size;
  const lightLength = Math.max(2, Math.round(rows * 0.24));
  const darkLength = Math.max(2, Math.round(rows * 0.5));
  const light = 1 - (py - box.y) / size / lightLength;
  if (isInked(matrix, cx, cy, light)) {
    return { ink: LIGHT, tone: cover };
  }
  const dark = 1 - (box.y + box.h - py) / size / darkLength;
  return { ink: isInked(matrix, cx, cy, dark) ? DARK : BASE, tone: cover };
};

/**
 * The underline: a bar along the bottom (or the start edge, when vertical)
 * that fades towards both ends, under a sparse glow towards the label.
 */
const underlineSample = (
  box: Box,
  px: number,
  py: number,
  { size, vertical }: ShapeContext
): Sample => {
  // Along the bar and across it, measured from the bar's outer edge.
  const along = vertical ? (py - box.y) / box.h : (px - box.x) / box.w;
  const across = vertical ? px - box.x : box.y + box.h - py;
  const depth = vertical ? box.w : box.h;
  if (along < 0 || along > 1 || across < 0 || across > depth) {
    return NONE;
  }
  const ends = smooth(0, 0.62, Math.min(along, 1 - along) * 2);
  const bar = BAR_CELLS * size;
  if (across <= bar) {
    return { ink: BASE, tone: ends };
  }
  const rise = (across - bar) / (depth * GLOW_SHARE);
  return {
    ink: BASE,
    tone: rise >= 1 ? 0 : GLOW_PEAK * (1 - rise) ** 1.3 * ends,
  };
};

const SAMPLERS = {
  pill: pillSample,
  underline: underlineSample,
} as const satisfies Record<
  DitherTabsVariant,
  (box: Box, px: number, py: number, context: ShapeContext) => Sample
>;

/** Where a point sits along the body, 0 at the trailing end and 1 at the leading end. */
const alongBody = (scene: Scene, px: number, py: number) => {
  const [dx, dy] = scene.dir;
  const half = (Math.abs(dx) * scene.body.w + Math.abs(dy) * scene.body.h) / 2;
  if (half <= 0) {
    return 1;
  }
  const [bx, by] = centre(scene.body);
  return clamp01(((px - bx) * dx + (py - by) * dy) / (2 * half) + 0.5);
};

interface PaintOptions {
  canvas: HTMLCanvasElement;
  frame: { current: ImageData | null };
  grid: Grid;
  scene: Scene;
  inks: readonly Rgba[];
  variant: DitherTabsVariant;
  matrix: DitherMatrix;
  vertical: boolean;
}

const toByte = (value: number) => Math.round(clamp01(value) * 255);

const paint = ({
  canvas,
  frame,
  grid,
  scene,
  inks,
  variant,
  matrix,
  vertical,
}: PaintOptions) => {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }
  const { cols, rows, size } = grid;
  if (frame.current?.width !== cols || frame.current.height !== rows) {
    frame.current = context.createImageData(cols, rows);
  }
  const { data } = frame.current;
  const bytes = inks.map((ink) => ink.map(toByte));
  const sample = SAMPLERS[variant];
  for (let cy = 0; cy < rows; cy += 1) {
    for (let cx = 0; cx < cols; cx += 1) {
      const px = (cx + 0.5) * size;
      const py = (cy + 0.5) * size;
      const shape: ShapeContext = { cx, cy, matrix, size, vertical };
      let best = sample(scene.body, px, py, shape);
      if (best.tone > 0 && scene.trail < 1) {
        const s = alongBody(scene, px, py);
        best = {
          ink: best.ink,
          tone: best.tone * lerp(scene.trail, 1, smooth(0, 0.9, s)),
        };
      }
      for (const ghost of scene.ghosts) {
        if (ghost.tone > 0) {
          const hit = sample(ghost.box, px, py, shape);
          if (hit.tone * ghost.tone > best.tone) {
            best = { ink: hit.ink, tone: hit.tone * ghost.tone };
          }
        }
      }
      const offset = (cy * cols + cx) * 4;
      const on = best.tone > 0 && isInked(matrix, cx, cy, best.tone);
      const [red = 0, green = 0, blue = 0, alpha = 255] =
        bytes[best.ink] ?? bytes[BASE] ?? [];
      data[offset] = red;
      data[offset + 1] = green;
      data[offset + 2] = blue;
      data[offset + 3] = on ? alpha : 0;
    }
  }
  context.putImageData(frame.current, 0, 0);
};

/** The colours the canvas inks with: the plain colour, then lit and shaded mixes. */
const inkNames = (color: DitherColor) => {
  const base = cssColor(color);
  return [
    base,
    `color-mix(in oklab, ${base}, white 42%)`,
    `color-mix(in oklab, ${base}, black 48%)`,
  ] as const;
};

/** Offset of `el` from `list`'s padding edge, summed up the offset chain. */
const offsetWithin = (el: HTMLElement, list: HTMLElement): Box => {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== list) {
    x += node.offsetLeft;
    y += node.offsetTop;
    const parent: Element | null = node.offsetParent;
    node = parent instanceof HTMLElement ? parent : null;
  }
  return { h: el.offsetHeight, w: el.offsetWidth, x, y };
};

const measureList = (list: HTMLElement): Geometry => {
  const boxes = new Map<string, Box>();
  for (const el of list.querySelectorAll<HTMLElement>(
    "[data-slot='tabs-trigger'][data-value]"
  )) {
    const { value } = el.dataset;
    if (value !== undefined && el.closest("[data-slot='tabs-list']") === list) {
      boxes.set(value, offsetWithin(el, list));
    }
  }
  // The triggers' extent, not scrollWidth: the canvas layer itself counts
  // towards scrollWidth, so a list that shrank would keep its old width.
  const style = getComputedStyle(list);
  const padRight = Number.parseFloat(style.paddingRight) || 0;
  const padBottom = Number.parseFloat(style.paddingBottom) || 0;
  let width = list.clientWidth;
  let height = list.clientHeight;
  for (const box of boxes.values()) {
    width = Math.max(width, box.x + box.w + padRight);
    height = Math.max(height, box.y + box.h + padBottom);
  }
  return { boxes, height, width };
};

const sameBox = (a: Box | undefined, b: Box | undefined) =>
  a !== undefined &&
  b !== undefined &&
  a.x === b.x &&
  a.y === b.y &&
  a.w === b.w &&
  a.h === b.h;

/** Merge an outside ref with our own. */
const useMergedRef = <T,>(
  own: { current: T | null },
  outside: Ref<T> | undefined
) =>
  useCallback(
    (node: T | null) => {
      own.current = node;
      if (typeof outside === "function") {
        outside(node);
      } else if (outside) {
        outside.current = node;
      }
    },
    [own, outside]
  );

export type DitherTabsProps = ComponentProps<typeof TabsPrimitive.Root> & {
  /** `pill` lights a dithered surface behind the label; `underline` draws a dithered bar under it. Default `"pill"`. */
  variant?: DitherTabsVariant;
  /** Indicator colour: a palette name or any CSS colour. Default `"ink"`. */
  color?: DitherColor;
  /** Size of one dither cell in CSS pixels. Default 2. */
  cell?: number;
  /** A soft glow in the indicator's colour. Default `"off"`. */
  bloom?: Bloom;
  /** Threshold matrix: the order cells switch on and off as the indicator moves. Default `"bayer4"`. */
  matrix?: DitherMatrix;
};

/**
 * Tabs whose active indicator is a dithered surface. Choosing a tab sends
 * it gliding to the new trigger, dissolving out of the old one and in at
 * the new one through the Bayer levels. Radix Tabs underneath, so arrow
 * keys, roving focus and ARIA come for free.
 */
export const DitherTabs = ({
  variant = "pill",
  color = "ink",
  cell = 2,
  bloom = "off",
  matrix = "bayer4",
  value: valueProp,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  className,
  children,
  onKeyDownCapture,
  onPointerDownCapture,
  ...props
}: DitherTabsProps) => {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  // Arrow keys step through tabs quickly, so a tab chosen from the
  // keyboard jumps there; only a click or tap glides.
  const fromKeyboard = useRef(false);
  const value = valueProp ?? uncontrolled;
  const look: TabsLook = {
    bloom,
    cell: Math.max(1, Math.round(cell)),
    color,
    keyboard: fromKeyboard,
    matrix,
    orientation,
    value,
    variant,
  };

  return (
    <TabsLookContext value={look}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-variant={variant}
        value={value}
        orientation={orientation}
        onKeyDownCapture={(event) => {
          fromKeyboard.current = true;
          onKeyDownCapture?.(event);
        }}
        onPointerDownCapture={(event) => {
          fromKeyboard.current = false;
          onPointerDownCapture?.(event);
        }}
        onValueChange={(next) => {
          if (valueProp === undefined) {
            setUncontrolled(next);
          }
          onValueChange?.(next);
        }}
        className={cn(
          "flex gap-4",
          orientation === "vertical" ? "flex-row" : "flex-col",
          className
        )}
        {...props}
      >
        {children}
      </TabsPrimitive.Root>
    </TabsLookContext>
  );
};

export type DitherTabsListProps = ComponentProps<typeof TabsPrimitive.List>;

const LIST = {
  pill: "bg-muted h-10 items-center gap-1 rounded-[12px] p-1 data-[orientation=vertical]:h-auto data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
  underline:
    "items-end gap-1 shadow-[inset_0_-1px_0_var(--border)] data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:shadow-[inset_1px_0_0_var(--border)]",
} as const satisfies Record<DitherTabsVariant, string>;

/**
 * The row of triggers, with the dithered indicator drawn behind them.
 */
export const DitherTabsList = ({
  className,
  style,
  children,
  ref,
  ...props
}: DitherTabsListProps) => {
  const look = useTabsLook("DitherTabsList");
  const { variant, matrix, color, bloom, value, orientation } = look;
  const vertical = orientation === "vertical";
  const listRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<ImageData | null>(null);
  const geometryRef = useRef<Geometry | null>(null);
  const gridRef = useRef<Grid | null>(null);
  const glideRef = useRef<Glide | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const shownRef = useRef<string | null>(null);
  const rafRef = useRef(0);
  const [ready, setReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const inks = useDitherColors(listRef, inkNames(color));
  const setRef = useMergedRef(listRef, ref);

  // Everything a frame needs, read by the loop without restarting it.
  const live = useRef({ inks, matrix, variant, vertical });
  useLayoutEffect(() => {
    live.current = { inks, matrix, variant, vertical };
  });

  const draw = useCallback((scene: Scene) => {
    const canvas = canvasRef.current;
    const grid = gridRef.current;
    const { inks: colours, ...rest } = live.current;
    sceneRef.current = scene;
    if (!(canvas && grid && colours)) {
      return false;
    }
    paint({ canvas, frame: frameRef, grid, inks: colours, scene, ...rest });
    return true;
  }, []);

  const frame = useCallback(
    (now: number) => {
      const glide = glideRef.current;
      const target = glide
        ? geometryRef.current?.boxes.get(glide.to)
        : undefined;
      if (!(glide && target)) {
        glideRef.current = null;
        rafRef.current = 0;
        return;
      }
      const progress = (now - glide.start) / DURATION;
      if (progress >= 1) {
        glideRef.current = null;
        rafRef.current = 0;
        draw(restScene(target));
        return;
      }
      draw(glideScene(glide.from, target, progress));
      rafRef.current = requestAnimationFrame(frame);
    },
    [draw]
  );

  /** Draw the selection as it stands: at rest, or the current frame of a move. */
  const redraw = useCallback(() => {
    if (glideRef.current) {
      return;
    }
    const box =
      value === undefined ? undefined : geometryRef.current?.boxes.get(value);
    if (draw(restScene(box ?? EMPTY_BOX)) && box) {
      setReady(true);
    }
  }, [draw, value]);

  const measure = useCallback(() => {
    const list = listRef.current;
    const canvas = canvasRef.current;
    if (!(list && canvas)) {
      return;
    }
    const geometry = measureList(list);
    geometryRef.current = geometry;
    // Whole device pixels per cell, as the shader does, so every cell is the same size.
    const ratio = window.devicePixelRatio || 1;
    const size = Math.max(1, Math.round(look.cell * ratio)) / ratio;
    const cols = Math.max(1, Math.ceil(geometry.width / size));
    const rows = Math.max(1, Math.ceil(geometry.height / size));
    const grid = gridRef.current;
    if (grid?.cols !== cols || grid.rows !== rows || grid.size !== size) {
      gridRef.current = { cols, rows, size };
      canvas.width = cols;
      canvas.height = rows;
      canvas.style.width = `${cols * size}px`;
      canvas.style.height = `${rows * size}px`;
      const clip = canvas.parentElement;
      if (clip) {
        clip.style.width = `${geometry.width}px`;
        clip.style.height = `${geometry.height}px`;
      }
    }
    redraw();
  }, [look.cell, redraw]);

  // Move to the new selection: a glide, or a jump under reduced motion.
  // Before the measuring effect, which would otherwise draw the new tab at rest first.
  useLayoutEffect(() => {
    const previous = shownRef.current;
    shownRef.current = value ?? null;
    const boxes = geometryRef.current?.boxes;
    // From wherever the indicator is drawn now, mid-move or at rest.
    const drawn = sceneRef.current?.body;
    const from = drawn && drawn.w > 0 ? drawn : boxes?.get(previous ?? "");
    const to = value === undefined ? undefined : boxes?.get(value);
    if (
      reducedMotion ||
      look.keyboard.current ||
      previous === null ||
      value === undefined ||
      from === undefined ||
      sameBox(from, to)
    ) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      glideRef.current = null;
      redraw();
      return;
    }
    glideRef.current = { from, start: performance.now(), to: value };
    if (rafRef.current === 0) {
      rafRef.current = requestAnimationFrame(frame);
    }
  }, [value, reducedMotion, frame, redraw, look.keyboard]);

  // Measure on mount, whenever the list or a trigger resizes, and once web fonts load.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(list);
    for (const trigger of list.querySelectorAll("[data-slot='tabs-trigger']")) {
      observer.observe(trigger);
    }
    const { fonts } = document;
    let alive = true;
    const afterFonts = async () => {
      await fonts.ready;
      if (alive) {
        measure();
      }
    };
    afterFonts();
    fonts.addEventListener("loadingdone", measure);
    return () => {
      alive = false;
      observer.disconnect();
      fonts.removeEventListener("loadingdone", measure);
    };
  }, [measure, children]);

  // Redraw when the colours, matrix or variant change (a theme switch, a knob).
  useEffect(() => {
    if (glideRef.current) {
      return;
    }
    redraw();
  }, [inks, matrix, variant, vertical, redraw]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const fallback: CSSProperties & Record<`--${string}`, string> = {
    "--dcn-tabs-ink": cssColor(color),
  };

  return (
    <TabsPrimitive.List
      ref={setRef}
      data-slot="tabs-list"
      data-variant={variant}
      data-pending={ready ? undefined : ""}
      className={cn(
        "group/dither-tabs relative isolate inline-flex w-fit max-w-full",
        LIST[variant],
        className
      )}
      style={{ ...fallback, ...style }}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 -z-10 size-full"
        style={bloomStyle(color, bloom)}
      >
        <span className="absolute top-0 left-0 block size-full overflow-hidden">
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 block max-w-none [image-rendering:pixelated]"
          />
        </span>
      </span>
      {children}
    </TabsPrimitive.List>
  );
};

export type DitherTabsTriggerProps = ComponentProps<
  typeof TabsPrimitive.Trigger
>;

const TRIGGER = {
  pill: cn(
    "h-8 rounded-[8px] px-3.5",
    // The active label: light on the deeper light-theme colours, dark on the bright dark-theme ones.
    "data-[state=active]:text-white data-[state=active]:[text-shadow:0_1px_0_oklch(0_0_0/0.35)] dark:data-[state=active]:text-[oklch(0.13_0.02_268)] dark:data-[state=active]:[text-shadow:none]",
    "group-data-pending/dither-tabs:data-[state=active]:bg-(--dcn-tabs-ink)"
  ),
  underline: cn(
    "h-10 px-3 data-[state=active]:text-foreground",
    "group-data-pending/dither-tabs:data-[state=active]:shadow-[inset_0_-4px_0_var(--dcn-tabs-ink)]",
    "group-data-[orientation=vertical]/dither-tabs:justify-start group-data-[orientation=vertical]/dither-tabs:pl-4"
  ),
} as const satisfies Record<DitherTabsVariant, string>;

const HOVER = {
  pill: "inset-0 rounded-[inherit]",
  underline:
    "inset-x-0 bottom-0 h-(--dcn-tabs-bar) group-data-[orientation=vertical]/dither-tabs:inset-y-0 group-data-[orientation=vertical]/dither-tabs:right-auto group-data-[orientation=vertical]/dither-tabs:h-auto group-data-[orientation=vertical]/dither-tabs:w-(--dcn-tabs-bar)",
} as const satisfies Record<DitherTabsVariant, string>;

/**
 * One tab. Inactive triggers show a sparse dot lattice in the indicator's
 * colour on hover.
 */
export const DitherTabsTrigger = ({
  className,
  style,
  value,
  children,
  ...props
}: DitherTabsTriggerProps) => {
  const look = useTabsLook("DitherTabsTrigger");
  const hover: CSSProperties & Record<`--${string}`, string> = {
    ...fillStyle("dotted", { cell: look.cell, color: look.color }),
    "--dcn-tabs-bar": `${look.cell * BAR_CELLS}px`,
  };
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      data-value={value}
      value={value}
      className={cn(
        "group/tab relative isolate inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 text-sm font-medium whitespace-nowrap select-none",
        "text-muted-foreground transition-[color] duration-200 ease-(--ease-out) hover:text-foreground motion-reduce:transition-none",
        // The label changes colour as the indicator arrives, not before.
        "data-[state=active]:delay-100 motion-reduce:data-[state=active]:delay-0",
        "outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
        "disabled:cursor-not-allowed disabled:opacity-45",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        TRIGGER[look.variant],
        className
      )}
      style={style}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -z-10 opacity-0 transition-opacity duration-200 ease-(--ease-out) motion-reduce:transition-none",
          "group-data-[state=inactive]/tab:group-hover/tab:opacity-40 group-data-[state=active]/tab:duration-0",
          HOVER[look.variant]
        )}
        style={hover}
      />
      {children}
    </TabsPrimitive.Trigger>
  );
};

export type DitherTabsContentProps = ComponentProps<
  typeof TabsPrimitive.Content
>;

/**
 * One panel. It shows at once: the indicator carries the motion, and the
 * panel's text stays readable the moment it appears.
 */
export const DitherTabsContent = ({
  className,
  ...props
}: DitherTabsContentProps) => {
  useTabsLook("DitherTabsContent");
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 rounded-md outline-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring focus-visible:outline-solid",
        className
      )}
      {...props}
    />
  );
};
