import type { ComponentProps, ReactNode } from "react";

import { isInked } from "@/lib/dither";
import type { DitherColor, DitherMatrix } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * Each motif is a list of shapes on a 44x32 grid of cells, painted in
 * order. A shape is either shading, with a tone from 0 to 1 that the Bayer
 * matrix turns into dots of ink, or a line: solid one-cell outlines in the
 * line colour that give the drawing its edges. Behind everything sits a
 * soft round halo. The grid is rasterised once per motif and matrix into
 * two SVG paths, so the drawing is pixel art with real dither shading,
 * never a scaled or blurred image.
 */

const COLS = 44;
const ROWS = 32;

export type EmptyStateMotif = "inbox" | "search" | "folder" | "chart";

type Test = (x: number, y: number) => boolean;

type Shape =
  | { kind: "shade"; test: Test; tone: number }
  | { kind: "line"; test: Test };

const rect =
  (x0: number, y0: number, x1: number, y1: number): Test =>
  (x, y) =>
    x >= x0 && x <= x1 && y >= y0 && y <= y1;

/** The one-cell border of a rectangle. */
const frame =
  (x0: number, y0: number, x1: number, y1: number): Test =>
  (x, y) =>
    rect(x0, y0, x1, y1)(x, y) &&
    (x === x0 || x === x1 || y === y0 || y === y1);

const disc =
  (cx: number, cy: number, radius: number): Test =>
  (x, y) =>
    Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= radius;

const ring =
  (cx: number, cy: number, inner: number, outer: number): Test =>
  (x, y) => {
    const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    return distance >= inner && distance <= outer;
  };

/** A thick line from (x0, y0) to (x1, y1) with round ends. */
const capsule =
  (x0: number, y0: number, x1: number, y1: number, radius: number): Test =>
  (x, y) => {
    const px = x + 0.5 - x0;
    const py = y + 0.5 - y0;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const t = Math.min(
      1,
      Math.max(0, (px * dx + py * dy) / (dx * dx + dy * dy))
    );
    return Math.hypot(px - dx * t, py - dy * t) <= radius;
  };

const any =
  (...tests: Test[]): Test =>
  (x, y) =>
    tests.some((test) => test(x, y));

const not =
  (test: Test): Test =>
  (x, y) =>
    !test(x, y);

const both =
  (a: Test, b: Test): Test =>
  (x, y) =>
    a(x, y) && b(x, y);

const shade = (test: Test, tone: number): Shape => ({
  kind: "shade",
  test,
  tone,
});
const line = (test: Test): Shape => ({ kind: "line", test });

const TRAY = both(rect(6, 17, 38, 28), not(rect(15, 17, 29, 19)));
const TRAY_EDGE = any(
  rect(6, 17, 15, 17),
  rect(29, 17, 38, 17),
  rect(15, 17, 15, 20),
  rect(29, 17, 29, 20),
  rect(15, 20, 29, 20),
  rect(6, 17, 6, 28),
  rect(38, 17, 38, 28),
  rect(6, 28, 38, 28)
);

const MOTIFS = {
  chart: [
    // Ghost bars, waiting for data.
    shade(rect(12, 17, 16, 25), 0.22),
    shade(rect(12, 17, 16, 17), 1),
    shade(rect(19, 10, 23, 25), 0.22),
    shade(rect(19, 10, 23, 10), 1),
    shade(rect(26, 20, 30, 25), 0.22),
    shade(rect(26, 20, 30, 20), 1),
    shade(rect(33, 13, 37, 25), 0.22),
    shade(rect(33, 13, 37, 13), 1),
    line(any(rect(8, 4, 8, 26), rect(8, 26, 39, 26))),
  ],
  folder: [
    shade(any(rect(7, 4, 17, 7), rect(7, 7, 37, 26)), 0.28),
    line(any(frame(7, 4, 17, 7), frame(7, 7, 37, 26))),
    // A sheet of paper peeking out.
    shade(rect(11, 9, 33, 15), 0.08),
    line(frame(11, 9, 33, 15)),
    shade(rect(14, 11, 25, 11), 1),
    // The front flap.
    shade(rect(5, 13, 39, 27), 0.5),
    line(frame(5, 13, 39, 27)),
  ],
  inbox: [
    // A letter sitting in the tray.
    shade(rect(15, 4, 29, 19), 0.08),
    line(frame(15, 4, 29, 20)),
    shade(rect(18, 8, 26, 8), 1),
    shade(rect(18, 11, 25, 11), 1),
    shade(rect(18, 14, 23, 14), 1),
    shade(TRAY, 0.5),
    line(TRAY_EDGE),
  ],
  search: [
    // Glass, brighter at the top left.
    shade(disc(19, 14, 8.6), 0.1),
    shade(disc(15.5, 10.5, 3.2), 0.5),
    line(ring(19, 14, 8.6, 9.9)),
    shade(capsule(27, 22, 35, 30, 2.4), 0.55),
    line(both(capsule(27, 22, 35, 30, 2.6), not(capsule(27, 22, 35, 30, 1.5)))),
  ],
} as const satisfies Record<EmptyStateMotif, readonly Shape[]>;

/** The halo's tone at a cell: strongest at the centre, gone by its edge. */
const haloTone = (x: number, y: number) => {
  const distance = Math.hypot((x + 0.5 - COLS / 2) / 1.3, y + 0.5 - ROWS / 2);
  const falloff = Math.max(0, 1 - distance / 17);
  return 0.32 * falloff ** 1.4;
};

interface Paths {
  /** Dithered shading, in the ink colour. */
  ink: string;
  /** Solid outlines, in the line colour. */
  line: string;
}

const pathCache = new Map<string, Paths>();

const cellRect = (x: number, y: number, length: number) =>
  `M${x} ${y}h${length}v1h${-length}z`;

/** Two SVG paths, ink and line, with neighbouring cells in a row merged. */
const rasterise = (
  key: string,
  shapes: readonly Shape[],
  matrix: DitherMatrix
): Paths => {
  const cached = pathCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  let ink = "";
  let outline = "";
  for (let y = 0; y < ROWS; y += 1) {
    let inkStart = -1;
    let lineStart = -1;
    for (let x = 0; x <= COLS; x += 1) {
      let tone = haloTone(x, y);
      let isLine = false;
      for (const shape of shapes) {
        if (shape.test(x, y)) {
          isLine = shape.kind === "line";
          tone = shape.kind === "shade" ? shape.tone : 0;
        }
      }
      const inside = x < COLS;
      const inked = inside && !isLine && isInked(matrix, x, y, tone);
      const lined = inside && isLine;
      if (inked && inkStart === -1) {
        inkStart = x;
      } else if (!inked && inkStart !== -1) {
        ink += cellRect(inkStart, y, x - inkStart);
        inkStart = -1;
      }
      if (lined && lineStart === -1) {
        lineStart = x;
      } else if (!lined && lineStart !== -1) {
        outline += cellRect(lineStart, y, x - lineStart);
        lineStart = -1;
      }
    }
  }
  const paths = { ink, line: outline };
  pathCache.set(key, paths);
  return paths;
};

const toCss = (color: DitherColor) =>
  color.startsWith("--") ? `var(${color})` : color;

interface MotifIllustration {
  /** A built-in illustration. Default `"inbox"`. */
  motif?: EmptyStateMotif;
  icon?: never;
}

interface IconIllustration {
  /** Your own glyph, drawn over the dithered halo instead of a motif. */
  icon: ReactNode;
  motif?: never;
}

export type EmptyStateIllustration = MotifIllustration | IconIllustration;

export type EmptyStateProps = Omit<ComponentProps<"div">, "title" | "color"> &
  EmptyStateIllustration & {
    /** The heading. Say what is empty, plainly. */
    title: ReactNode;
    /** One or two sentences: why it is empty and what to do next. */
    description?: ReactNode;
    /** Buttons or links, under the text. */
    action?: ReactNode;
    /** Colour of the dithered shading and halo. Default `--dither-ink`. */
    color?: DitherColor;
    /** Colour of the motif's outlines. Default `--foreground`. */
    lineColor?: DitherColor;
    /** Threshold matrix. Default `"bayer4"`. */
    matrix?: DitherMatrix;
    /** Size of one dither cell in CSS pixels. Default 3. */
    cell?: number;
  };

const Illustration = ({
  illustration,
  color,
  lineColor,
  matrix,
  cell,
}: {
  illustration: EmptyStateIllustration;
  color: DitherColor;
  lineColor: DitherColor;
  matrix: DitherMatrix;
  cell: number;
}) => {
  const motif = illustration.motif ?? "inbox";
  const hasIcon = illustration.icon !== undefined;
  const shapes = hasIcon ? [] : MOTIFS[motif];
  const paths = rasterise(
    `${hasIcon ? "icon" : motif}:${matrix}`,
    shapes,
    matrix
  );
  return (
    <div
      className="relative grid place-items-center"
      style={{ height: ROWS * cell, width: COLS * cell }}
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${COLS} ${ROWS}`}
        width={COLS * cell}
        height={ROWS * cell}
        shapeRendering="crispEdges"
        className="absolute inset-0"
      >
        <path d={paths.ink} style={{ fill: toCss(color) }} />
        <path d={paths.line} style={{ fill: toCss(lineColor) }} />
      </svg>
      {hasIcon ? (
        <div className="bg-background text-foreground ring-border relative grid size-12 place-items-center rounded-xl shadow-sm ring-1 [&_svg:not([class*='size-'])]:size-5">
          {illustration.icon}
        </div>
      ) : null}
    </div>
  );
};

/**
 * A placeholder for a view with nothing in it yet: a dithered
 * illustration, a title, a short description and an action. Pick a
 * built-in `motif`, or pass your own `icon`.
 */
export const EmptyState = ({
  title,
  description,
  action,
  color = "--dither-ink",
  lineColor = "--foreground",
  matrix = "bayer4",
  cell = 3,
  motif,
  icon,
  className,
  ...props
}: EmptyStateProps) => {
  const illustration: EmptyStateIllustration =
    icon === undefined ? { motif } : { icon };
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center px-6 py-10 text-center",
        className
      )}
      {...props}
    >
      <Illustration
        illustration={illustration}
        color={color}
        lineColor={lineColor}
        matrix={matrix}
        cell={Math.max(1, Math.round(cell))}
      />
      <div className="mt-5 flex max-w-sm flex-col gap-1.5">
        <h3 className="text-base font-semibold tracking-tight text-balance">
          {title}
        </h3>
        {description === undefined ? null : (
          <p className="text-muted-foreground text-sm text-pretty">
            {description}
          </p>
        )}
      </div>
      {action === undefined ? null : (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
};
