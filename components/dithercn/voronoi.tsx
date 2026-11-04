"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cssColor, DitherShader, readDitherCell } from "@/lib/dither";
import type {
  DitherColor,
  DitherPalette,
  DitherShaderProps,
} from "@/lib/dither";

/** How the cells are drawn. */
export type VoronoiVariant = "foam" | "glaze" | "stone";

export type VoronoiProps = Omit<
  DitherShaderProps,
  "field" | "colorField" | "uniforms" | "fallback"
> & {
  /**
   * `"foam"`: bright thin walls with Plateau borders where they meet, and dark
   * cells lit softly from inside. `"glaze"`: flat cells at stepped dither
   * levels split by open cracks, with a finer crackle across them.
   * `"stone"`: raised tiles with rounded corners, bevelled and lit from the
   * top left. Default `"foam"`.
   */
  variant?: VoronoiVariant;
  /** How many cells fit in the box. 1 puts about five across its shorter side; 2 doubles that. Default 1. */
  scale?: number;
  /** Width of the walls between cells, in dither cells, the same along every wall. Capped at a fifth of a cell's size. Default 1.5. */
  wall?: number;
  /** How fast the seeds wander, so cells swell, shrink and trade edges. 0 holds them still. Default 1. */
  drift?: number;
  /** How far the cells fade out in the middle of the box, 0 to 1, to clear room for text. Default 0. */
  fade?: number;
  /**
   * Give each cell its own colour, picked from this list. Walls in `"foam"`
   * keep the last palette colour; the rest of the palette is unused.
   */
  colors?: readonly [DitherColor, ...DitherColor[]];
};

const FIELD = `
// One seed per grid square, wandering inside it on its own slow loop.
vec2 voronoiSeed(vec2 square, float t) {
  vec2 h = vec2(hash21(square), hash21(square + vec2(19.7, 7.3)));
  vec2 rate = (0.16 + 0.14 * h.yx) * voronoiDrift;
  return 0.5 + 0.42 * sin(6.2831853 * h + t * rate);
}

// Exact Voronoi in two passes, after Inigo Quilez: find the nearest seed, then
// measure the distance to the bisector between it and each neighbour. Returns
// the two smallest edge distances in grid units. edgeNormals holds the outward
// normals of those two edges, toSeed points from p to the cell's seed.
vec2 voronoiEdges(vec2 p, float t, out vec2 id, out vec2 toSeed, out vec4 edgeNormals) {
  vec2 base = floor(p);
  vec2 f = p - base;
  vec2 nearSquare = vec2(0.0);
  vec2 nearSeed = vec2(0.0);
  float best = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 r = g + voronoiSeed(base + g, t) - f;
      float d = dot(r, r);
      if (d < best) {
        best = d;
        nearSeed = r;
        nearSquare = g;
      }
    }
  }
  vec2 edges = vec2(8.0);
  edgeNormals = vec4(0.0, 1.0, 0.0, 1.0);
  for (int j = -2; j <= 2; j++) {
    for (int i = -2; i <= 2; i++) {
      vec2 g = nearSquare + vec2(float(i), float(j));
      vec2 r = g + voronoiSeed(base + g, t) - f;
      vec2 gap = r - nearSeed;
      if (dot(gap, gap) > 1e-5) {
        vec2 n = normalize(gap);
        float d = dot(0.5 * (nearSeed + r), n);
        if (d < edges.x) {
          edges = vec2(d, edges.x);
          edgeNormals = vec4(n, edgeNormals.xy);
        } else if (d < edges.y) {
          edges.y = d;
          edgeNormals.zw = n;
        }
      }
    }
  }
  id = base + nearSquare;
  toSeed = nearSeed;
  return edges;
}

// A smooth minimum of the two nearest edges: it rounds the corners where walls meet.
float voronoiRound(vec2 e, float k) {
  float h = max(k - abs(e.x - e.y), 0.0) / max(k, 1e-4);
  return min(e.x, e.y) - h * h * k * 0.25;
}

// 1 across the box, dropping towards an oval in the middle as fade grows.
float voronoiClear(vec2 uv) {
  vec2 q = (uv - 0.5) * vec2(2.0, 2.4);
  return mix(1.0, smoothstep(0.5, 1.3, length(q)), voronoiFade);
}

float voronoiTone(vec2 uv, vec2 res, float t, out float wall, out vec2 id) {
  // Grid squares are measured in dither cells, so walls keep one width.
  float unit = min(res.x, res.y) / voronoiScale;
  vec2 p = uv * res / unit;
  vec2 toSeed;
  vec4 edgeNormals;
  vec2 e = voronoiEdges(p, t, id, toSeed, edgeNormals) * unit;
  // Capped at a fifth of a grid square, so small cells never close up.
  float wallWidth = min(voronoiWall, unit * 0.2);
  float halfWall = wallWidth * 0.5;
  float grain = hash21(id + vec2(3.1, 8.7));
  // Cells fade as a whole, by where their seed sits; walls fade cell by cell.
  float cellClear = voronoiClear((p + toSeed) * unit / res);
  float wallClear = voronoiClear(uv);

  if (voronoiMode < 0.5) {
    // Foam: walls thicken where three meet, and light gathers just inside
    // them, more on the side facing the top left. The middles stay dark.
    float d = voronoiRound(e, min(wallWidth * 1.5 + unit * 0.06, unit * 0.25));
    wall = 1.0 - smoothstep(halfWall - 0.5, halfWall + 0.5, d);
    float inner = max(d - halfWall, 0.0) / unit;
    float lit = 0.62 + 0.38 * dot(edgeNormals.xy, vec2(-0.6, 0.8));
    float glow = 0.36 * lit * exp(-inner * 11.0);
    float body = glow + 0.035 * grain;
    return max(wall * wallClear, body * cellClear);
  }

  if (voronoiMode < 1.5) {
    // Glaze: open cracks, cells at one of four exact dither levels, and a
    // finer crackle running across them.
    wall = 1.0 - smoothstep(halfWall - 0.5, halfWall + 0.5, e.x);
    float level = (3.0 + 3.0 * floor(grain * 4.0)) / 16.0;
    vec2 fineId;
    vec2 fineSeed;
    vec4 fineNormals;
    vec2 fine = voronoiEdges(p * 2.6 + vec2(31.0, 17.0), t * 0.5, fineId, fineSeed, fineNormals) * unit / 2.6;
    // About half the cells crazed, and not every fine crack in those.
    float crazed = step(0.5, hash21(id + vec2(9.2, 4.1))) * step(0.3, hash21(fineId));
    float crackle = (1.0 - smoothstep(0.2, 0.9, fine.x)) * crazed;
    // Fading steps a cell down a third at a time, so it stays flat.
    float stepClear = floor(cellClear * 3.0 + 0.4) / 3.0;
    return (1.0 - wall) * level * (1.0 - 0.6 * crackle) * stepClear;
  }

  // Stone: grout between raised tiles with rounded corners. The bevel faces
  // out through the nearest edge, blended across the two edges at a corner,
  // and is lit from the top left.
  float k = wallWidth + unit * 0.14;
  float d = voronoiRound(e, k);
  wall = 1.0 - smoothstep(halfWall - 0.5, halfWall + 0.5, d);
  float corner = max(k - abs(e.x - e.y), 0.0) / max(k, 1e-4);
  vec2 n = normalize(mix(edgeNormals.xy, edgeNormals.zw, 0.5 * corner * corner) + 1e-5);
  float facing = dot(n, vec2(-0.6, 0.8));
  float slope = clamp(0.42 + 0.5 * facing, 0.0, 1.0);
  float top = 0.3 + 0.16 * grain + 0.05 * snoise(p * 2.5 + id * 1.7);
  float rise = smoothstep(0.0, max(2.0, unit * 0.13), d - halfWall);
  return (1.0 - wall) * mix(slope, top, rise) * cellClear;
}

float field(vec2 uv, vec2 res, float t) {
  float wall;
  vec2 id;
  return voronoiTone(uv, res, t, wall, id);
}
`;

// Each cell takes one of the `colors`, which sit after the paper in the
// palette; the last palette entry, after them, colours foam walls.
const COLOR_FIELD = `
vec4 colorField(vec2 uv, vec2 res, float t) {
  float wall;
  vec2 id;
  voronoiTone(uv, res, t, wall, id);
  if (voronoiMode < 0.5 && wall > 0.5) {
    return paletteColor(1.0);
  }
  float pick = floor(hash21(id + vec2(5.3, 1.7)) * voronoiColors);
  return paletteColor(pick / voronoiColors);
}
`;

const MODES = { foam: 0, glaze: 1, stone: 2 } as const;

interface FallbackCell {
  readonly points: string;
  readonly grain: number;
}

type Point = readonly [number, number];

// A stable value in [0, 1) per grid square, so the server and client agree.
const fallbackHash = (x: number, y: number, salt: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43_758.5453;
  return s - Math.floor(s);
};

// Keep the side of the line through `mid` facing away from `normal`.
const clip = (polygon: readonly Point[], mid: Point, normal: Point) => {
  const side = ([x, y]: Point) =>
    (x - mid[0]) * normal[0] + (y - mid[1]) * normal[1];
  return polygon.flatMap((point, index): Point[] => {
    const next = polygon[(index + 1) % polygon.length] ?? point;
    const a = side(point);
    const b = side(next);
    const kept: Point[] = a <= 0 ? [point] : [];
    if (a <= 0 !== b <= 0) {
      const share = a / (a - b);
      kept.push([
        point[0] + (next[0] - point[0]) * share,
        point[1] + (next[1] - point[1]) * share,
      ]);
    }
    return kept;
  });
};

/** A still Voronoi diagram covering `columns` by `rows` grid squares, for the SVG fallback. */
const fallbackCells = ({
  columns,
  rows,
}: {
  columns: number;
  rows: number;
}): FallbackCell[] => {
  const seed = (x: number, y: number): Point => [
    x + 0.5 + 0.42 * Math.sin(6.283 * fallbackHash(x, y, 1)),
    y + 0.5 + 0.42 * Math.sin(6.283 * fallbackHash(x, y, 2)),
  ];
  const cells: FallbackCell[] = [];
  for (let y = -1; y <= rows; y += 1) {
    for (let x = -1; x <= columns; x += 1) {
      const [sx, sy] = seed(x, y);
      let polygon: readonly Point[] = [
        [x - 1, y - 1],
        [x + 2, y - 1],
        [x + 2, y + 2],
        [x - 1, y + 2],
      ];
      for (let j = -2; j <= 2; j += 1) {
        for (let i = -2; i <= 2; i += 1) {
          if (i !== 0 || j !== 0) {
            const [nx, ny] = seed(x + i, y + j);
            polygon = clip(
              polygon,
              [(sx + nx) / 2, (sy + ny) / 2],
              [nx - sx, ny - sy]
            );
          }
        }
      }
      cells.push({
        grain: fallbackHash(x, y, 3),
        points: polygon
          .map(([px, py]) => `${px.toFixed(3)},${py.toFixed(3)}`)
          .join(" "),
      });
    }
  }
  return cells;
};

interface BoxSize {
  readonly width: number;
  readonly height: number;
}

// Server and first client frame assume 16:9, so hydration matches; the
// measured box replaces it straight after.
const FIRST_BOX: BoxSize = { height: 9, width: 16 };

// Keeps a very long, thin box at large `scale` from drawing thousands of polygons.
const MAX_SQUARES = 2400;

const useBoxSize = (ref: { current: HTMLElement | null }) => {
  const [size, setSize] = useState<BoxSize | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width > 0 && height > 0) {
        setSize((last) =>
          last?.width === width && last.height === height
            ? last
            : { height, width }
        );
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
};

const share = (color: DitherColor, percent: number) =>
  `color-mix(in oklab, ${cssColor(color)} ${percent.toFixed(0)}%, transparent)`;

/** The same cells drawn as SVG polygons, shown without WebGL. */
const Fallback = ({
  variant,
  cells,
  wall,
  fade,
  cell,
  palette,
  colors,
}: {
  variant: VoronoiVariant;
  /** Grid squares across the box's shorter side, as in the shader. */
  cells: number;
  wall: number;
  fade: number;
  /** Dither cell size in CSS pixels; when unset, read from `--dither-cell`. */
  cell: number | undefined;
  palette: DitherPalette;
  colors: readonly DitherColor[] | undefined;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const box = useBoxSize(ref) ?? FIRST_BOX;
  // The shader reads `--dither-cell` when `cell` is unset, so the fallback
  // does too, once mounted; 3 is the engine's default until then.
  const [inherited, setInherited] = useState(3);
  useEffect(() => {
    if (cell === undefined && ref.current) {
      setInherited(readDitherCell(ref.current));
    }
  }, [cell]);
  // Like the shader, a grid square is the shorter side over `cells`.
  const fit = Math.max(
    1,
    Math.sqrt(
      (box.width * box.height * cells * cells) /
        (Math.min(box.width, box.height) ** 2 * MAX_SQUARES)
    )
  );
  const square = (Math.min(box.width, box.height) / cells) * fit;
  const viewWidth = box.width / square;
  const viewHeight = box.height / square;
  const columns = Math.ceil(viewWidth);
  const rows = Math.ceil(viewHeight);
  const polygons = useMemo(
    () => fallbackCells({ columns, rows }),
    [columns, rows]
  );
  const [paper, second] = palette;
  const ink = palette.at(-1) ?? second;
  // Capped at a fifth of a grid square, as in the shader. Only exact once
  // the box is measured, since the first frame's square is a guess.
  const wallPx = Math.min(wall * (cell ?? inherited), square * 0.2);
  const fillOf = (grain: number) => {
    const color =
      colors === undefined
        ? ink
        : (colors[Math.floor(grain * colors.length)] ?? ink);
    if (variant === "foam") {
      return share(color, 6 + 10 * grain);
    }
    if (variant === "glaze") {
      return share(color, 100 * ((3 + 3 * Math.floor(grain * 4)) / 16));
    }
    return share(color, 30 + 16 * grain);
  };
  return (
    <div
      ref={ref}
      className="absolute inset-0"
      style={{ backgroundColor: cssColor(paper) }}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 size-full"
        viewBox={`0 0 ${viewWidth.toFixed(3)} ${viewHeight.toFixed(3)}`}
        preserveAspectRatio="xMidYMid slice"
        style={{
          // The same oval the shader clears, as a mask.
          maskImage:
            fade > 0
              ? `radial-gradient(50% 41.7% at 50% 50%, rgb(0 0 0 / ${(1 - fade).toFixed(2)}) 50%, #000 130%)`
              : undefined,
        }}
      >
        {polygons.map(({ points, grain }) => (
          <polygon
            key={points}
            points={points}
            fill={fillOf(grain)}
            stroke={cssColor(variant === "foam" ? ink : paper)}
            strokeWidth={variant === "stone" ? wallPx * 1.6 : wallPx}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
};

/**
 * A cellular surface like soap foam, crackle glaze or a tiled floor, drawn as
 * a dither. Seeds drift slowly, so cells swell, shrink and trade edges, and
 * the walls between them keep one width. Decorative and full-bleed: size it
 * with `className`, usually `absolute inset-0`.
 */
export const Voronoi = ({
  variant = "foam",
  scale = 1,
  wall = 1.5,
  drift = 1,
  fade = 0,
  colors,
  palette = ["--dither-paper", "--dither-ink"],
  stillTime = 14,
  ...props
}: VoronoiProps) => {
  const cells = Math.min(40, Math.max(1, 5 * scale));
  const wallWidth = Math.min(12, Math.max(0.5, wall));
  const clear = Math.min(1, Math.max(0, fade));
  // With `colors`, the paper comes first, then the cell colours, then the ink.
  const shaderPalette: DitherPalette =
    colors === undefined
      ? palette
      : [palette[0], ...colors, palette.at(-1) ?? palette[1]];

  return (
    <DitherShader
      {...props}
      field={FIELD}
      colorField={colors === undefined ? undefined : COLOR_FIELD}
      palette={shaderPalette}
      stillTime={stillTime}
      uniforms={{
        voronoiColors: colors?.length ?? 1,
        voronoiDrift: Math.max(0, drift),
        voronoiFade: clear,
        voronoiMode: MODES[variant],
        voronoiScale: cells,
        voronoiWall: wallWidth,
      }}
      fallback={
        <Fallback
          variant={variant}
          cells={cells}
          wall={wallWidth}
          fade={clear}
          cell={props.cell}
          palette={palette}
          colors={colors}
        />
      }
    />
  );
};
