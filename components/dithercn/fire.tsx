"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

/** The edge the fire burns along. Its tongues rise away from it. */
export type FireEdge = "bottom" | "top";

export type FireProps = Omit<
  DitherShaderProps,
  "field" | "colorField" | "uniforms" | "fallback"
> & {
  /** How far up the box the tallest tongues reach, 0.1 to 1. Default 0.55. */
  height?: number;
  /** Width of the tongues. Higher values make more, narrower ones. Default 1. */
  scale?: number;
  /** How much of the edge burns, 0.1 to 1. Below 1 it gathers into one fire in the middle, tallest at its centre. Default 1. */
  spread?: number;
  /** Sideways lean. Negative leans left, positive right, -1 to 1. Default 0.15. */
  wind?: number;
  /** How many embers drift up above the flames, 0 (none) to 3. Default 1. */
  embers?: number;
  /** The brightest tone, 0 to 1. Lower it to sit text on top. Default 1. */
  intensity?: number;
  /** The edge the fire burns along. Default `"bottom"`. */
  edge?: FireEdge;
};

/**
 * Geometry shared by both shader functions. The engine keeps one copy of a
 * definition that appears word for word in `field` and `colorField`.
 */
const GEOMETRY = `
// x across the box in box heights, 0 in the middle; y up from the burning
// edge as a share of the box.
vec2 fireBox(vec2 uv, vec2 res) {
  float y = fireEdge > 0.5 ? 1.0 - uv.y : uv.y;
  return vec2((uv.x - 0.5) * res.x / res.y, y);
}

// 1 across the whole edge at spread 1. Below that, a parabola: one fire,
// tallest in the middle and dying out spread / 2 either side of it.
float fireProfile(float x, vec2 res) {
  float halfWidth = max(fireSpread * 0.5 * res.x / res.y, 1e-3);
  float across = x / halfWidth;
  return mix(clamp(1.0 - across * across, 0.0, 1.0), 1.0, smoothstep(0.85, 1.0, fireSpread));
}

// A ridge with a rounded top: 1 - fireRidge(n) peaks where noise n
// crosses zero, like 1 - abs(n), but without the sharp crease, so a tongue
// keeps some width just below its tip and its height eases in time instead
// of spiking.
float fireRidge(float n) {
  return sqrt(n * n + 0.0225) - 0.15;
}

// The heat of the flames: above 0 inside a tongue, 1 at the base, 0 at
// the edge. Each column of the fire reaches up to its crown: inverted
// ridged noise along x, whose peaks give tapering tips, and which changes
// slowly so tongues grow, shrink and split. A slow wave running up the fire
// bends their upper parts from side to side, and tall licks of noise
// scrolling upward tear off the tips and fray the edges. Every part moves
// slowly enough at a given dot that it rarely crosses the edge of a flame
// more than twice a second. density is the same heat with less of the
// licks in it, for how densely the dots fill the inside of the flames, so
// the fast part only moves the edges.
float fireHeat(vec2 b, vec2 res, float t, out float density) {
  float reach = max(fireHeight, 0.05);
  float h = b.y / reach;
  float s = 2.8 * fireScale;
  // The tongues lean with the wind, further the higher they get.
  float x = b.x - fireWind * 0.22 * b.y * (0.6 + 0.8 * h);
  x += 0.05 / fireScale * h * snoise(vec2(x * s * 0.5 + 4.1, b.y * s * 0.45 - t * 0.36));
  float big = 1.0 - fireRidge(snoise(vec2(x * s * 0.55, t * 0.18)));
  float small = 1.0 - fireRidge(snoise(vec2(x * s * 1.25 + 9.1, t * 0.25 + 3.0)));
  float crown = 0.29 + 0.58 * pow(big, 2.5) + 0.22 * small * small;
  float profile = fireProfile(b.x, res);
  crown *= mix(0.12, 1.0, profile);
  // Taller fires get taller licks, but less than in proportion, so a low
  // fire still has upright licks rather than squat blobs.
  vec2 q = vec2(x * s, b.y * s / (0.45 + 0.55 * reach));
  float lick = 0.7 * snoise(vec2(q.x * 1.1, q.y * 0.5 - t * 0.6))
    + 0.1 * snoise(vec2(q.x * 2.0, q.y - t * 0.72) + vec2(7.1, 2.3));
  lick *= 0.08 + 0.34 * smoothstep(0.0, 0.7, h);
  // Past the sides of a gathered fire nothing burns, the bed included, and
  // the cut-off narrows with height so the blaze slopes in towards the top.
  float base = 1.0 - h / crown - (1.0 - profile) * (1.15 + 1.5 * h);
  density = base + 0.4 * lick;
  return base + lick;
}

// Embers: one slot per 18 cells, in columns that rise at their own pace.
// Most slots are empty. An ember rises out of the flames, cools as it
// climbs, and winks out over half a second at a height of its own. age runs
// from 0 when it lights to 1 when it goes out. heat is the flames' heat at
// the same point: an ember shows only clear of them, so a dot at the edge
// of a flame never flickers with both.
float fireEmber(vec2 uv, vec2 res, float t, float heat, out float age) {
  age = 0.0;
  if (fireEmbers <= 0.0) {
    return 0.0;
  }
  vec2 c = uv * res;
  if (fireEdge > 0.5) {
    c.y = res.y - c.y;
  }
  float reach = max(fireHeight, 0.05) * res.y;
  float h = c.y / reach;
  // Carried by the same wind as the flames.
  c.x -= fireWind * 0.22 * c.y * (0.6 + 0.8 * min(h, 1.6));
  float size = 18.0;
  float column = floor(c.x / size);
  float rate = mix(9.0, 18.0, hash21(vec2(column, 7.7)));
  float y = c.y - t * rate + hash21(vec2(column, 3.1)) * 97.0;
  vec2 slot = vec2(column, floor(y / size));
  float seed = hash21(slot + vec2(0.37, 5.1));
  float present = step(1.0 - 0.14 * fireEmbers, seed);
  vec2 local = vec2(c.x - column * size, y - slot.y * size);
  vec2 at = 4.5 + vec2(hash21(slot + 4.1), hash21(slot + 8.3)) * (size - 9.0);
  at.x += 2.5 * sin(t * (1.1 + seed) + seed * 31.0);
  float radius = 0.8 + 0.7 * hash21(slot + 2.9);
  float spot = 1.0 - smoothstep(radius - 0.5, radius + 0.5, length(local - at));
  // Only over the burning part of the edge.
  spot *= smoothstep(0.1, 0.4, fireProfile(c.x / res.y - 0.5 * res.x / res.y, res));
  float born = 0.35 * reach;
  float end = mix(1.15, 2.1, hash21(slot + 6.6)) * reach;
  age = clamp((c.y - born) / max(end - born, 1.0), 0.0, 1.0);
  float life = smoothstep(born, born + 10.0, c.y) * (1.0 - smoothstep(end - 8.0, end, c.y));
  float glint = 0.85 + 0.15 * sin(t * 2.3 + seed * 40.0);
  float clear = 1.0 - smoothstep(-0.5, -0.15, heat);
  return spot * present * life * glint * clear * (1.0 - 0.4 * age);
}
`;

const FIELD = `${GEOMETRY}
float field(vec2 uv, vec2 res, float t) {
  vec2 b = fireBox(uv, res);
  float density;
  float heat = fireHeat(b, res, t, density);
  // A crisp edge, then denser towards the hot core. The peak stops short of
  // solid ink so the dither still shows in the base.
  float flame = smoothstep(0.0, 0.05, heat) * mix(0.5, 0.92, smoothstep(0.05, 0.7, density));
  float age;
  float ember = fireEmber(uv, res, t, heat, age);
  return max(flame, ember) * fireIntensity;
}
`;

const COLOR_FIELD = `${GEOMETRY}
vec3 colorField(vec2 uv, vec2 res, float t) {
  vec2 b = fireBox(uv, res);
  float density;
  float heat = fireHeat(b, res, t, density);
  float age;
  float ember = fireEmber(uv, res, t, heat, age);
  // A heat ramp through the inks: the first at the tips and edges, the last
  // in the base. Embers start hot and cool as they climb.
  float x = smoothstep(0.05, 1.0, heat);
  if (heat < 0.0 && ember > 0.05) {
    x = mix(0.8, 0.1, age);
  }
  // Each dot takes one palette colour, picked by a fixed per-cell
  // threshold, so the colours mix as dots and never blend into mud.
  vec2 cell = floor(uv * res);
  float scaled = x * fireInks;
  float pick = floor(scaled) + step(hash21(cell.yx + 17.3), fract(scaled));
  return paletteColor(pick / max(fireInks, 1.0)).rgb;
}
`;

/** Paper, a tint of the ink for the tips, then the ink for the base. */
const FIRE_PALETTE = [
  "--dither-paper",
  "color-mix(in oklch, var(--dither-ink) 55%, var(--dither-paper))",
  "--dither-ink",
] as const satisfies DitherPalette;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** GLSL's smoothstep, for the fallback's profile. */
const smooth = (lo: number, hi: number, x: number) => {
  const t = clamp((x - lo) / (hi - lo), 0, 1);
  return t * t * (3 - 2 * t);
};

// A stable value in [0, 1) per index, so the server and client agree.
const fallbackHash = (index: number, salt: number) => {
  const s = Math.sin(index * 127.1 + salt * 311.7) * 43_758.5453;
  return s - Math.floor(s);
};

const fixed = (value: number) => Number(value.toFixed(4));

interface BoxSize {
  readonly width: number;
  readonly height: number;
}

// Server and first client frame assume 16:9, so hydration matches; the
// measured box replaces it straight after.
const FIRST_BOX: BoxSize = { height: 9, width: 16 };

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

// GLSL's simplex noise from the engine, in TypeScript, so the fallback can
// trace the same flames the shader draws.
const C0 = 0.211_324_865_405_187;
const C1 = 0.366_025_403_784_439;
const C2 = -0.577_350_269_189_626;
const C3 = 0.024_390_243_902_439;
const mod289 = (x: number) => x - Math.floor(x / 289) * 289;
const permute = (x: number) => mod289((x * 34 + 1) * x);
const fract = (x: number) => x - Math.floor(x);

const noiseCorner = (p: number, x: number, y: number) => {
  let m = Math.max(0.5 - x * x - y * y, 0);
  m *= m;
  m *= m;
  const g = 2 * fract(p * C3) - 1;
  const h = Math.abs(g) - 0.5;
  const a0 = g - Math.floor(g + 0.5);
  m *= 1.792_842_914_001_59 - 0.853_734_720_953_14 * (a0 * a0 + h * h);
  return m * (a0 * x + h * y);
};

const snoise = (vx: number, vy: number) => {
  const skew = (vx + vy) * C1;
  const ix = Math.floor(vx + skew);
  const iy = Math.floor(vy + skew);
  const unskew = (ix + iy) * C0;
  const x0 = vx - ix + unskew;
  const y0 = vy - iy + unskew;
  const i1x = x0 > y0 ? 1 : 0;
  const i1y = 1 - i1x;
  const px = mod289(ix);
  const py = mod289(iy);
  return (
    130 *
    (noiseCorner(permute(permute(py) + px), x0, y0) +
      noiseCorner(
        permute(permute(py + i1y) + px + i1x),
        x0 + C0 - i1x,
        y0 + C0 - i1y
      ) +
      noiseCorner(permute(permute(py + 1) + px + 1), x0 + C2, y0 + C2))
  );
};

interface FlameShape {
  /** Box width over height. */
  readonly aspect: number;
  readonly height: number;
  readonly scale: number;
  readonly spread: number;
  readonly wind: number;
  /** The shader time of the still frame. */
  readonly time: number;
}

/** `fireProfile` from the shader. */
const flameProfile = (x: number, { aspect, spread }: FlameShape) => {
  const across = x / Math.max(spread * 0.5 * aspect, 1e-3);
  const gathered = smooth(0.85, 1, spread);
  return clamp(1 - across * across, 0, 1) * (1 - gathered) + gathered;
};

const ridge = (n: number) => Math.sqrt(n * n + 0.0225) - 0.15;

/**
 * `fireHeat` from the shader at one point: x across the box in box heights,
 * 0 in the middle, y up from the burning edge.
 */
const flameHeat = (bx: number, by: number, shape: FlameShape) => {
  const { height, scale, time: t, wind } = shape;
  const reach = Math.max(height, 0.05);
  const h = by / reach;
  const s = 2.8 * scale;
  let x = bx - wind * 0.22 * by * (0.6 + 0.8 * h);
  x += (0.05 / scale) * h * snoise(x * s * 0.5 + 4.1, by * s * 0.45 - t * 0.36);
  const big = 1 - ridge(snoise(x * s * 0.55, t * 0.18));
  const small = 1 - ridge(snoise(x * s * 1.25 + 9.1, t * 0.25 + 3));
  const profile = flameProfile(bx, shape);
  const crown =
    (0.29 + 0.58 * big ** 2.5 + 0.22 * small * small) * (0.12 + 0.88 * profile);
  const qx = x * s;
  const qy = (by * s) / (0.45 + 0.55 * reach);
  const lick =
    (0.7 * snoise(qx * 1.1, qy * 0.5 - t * 0.6) +
      0.1 * snoise(qx * 2 + 7.1, qy - t * 0.72 + 2.3)) *
    (0.08 + 0.34 * smooth(0, 0.7, h));
  return 1 - h / crown - (1 - profile) * (1.15 + 1.5 * h) + lick;
};

/**
 * The fallback's layers: the heat each one's edge follows, from the outer
 * flame in the first ink to the core in the last, and its opacity with one
 * ink or several. With one ink, the layers step up in opacity instead, as
 * the shader's dots get denser.
 */
const FLAME_LAYERS = [
  { heat: 0, level: 0, mono: 0.5, multi: 0.92 },
  { heat: 0.4, level: 0.5, mono: 0.72, multi: 0.95 },
  { heat: 0.72, level: 1, mono: 0.92, multi: 1 },
] as const;

/** Rows sampled up each column of the still frame. */
const FLAME_ROWS = 64;

type Point = readonly [x: number, y: number];

/** A smooth path through `points` (Catmull-Rom as cubic Béziers), y down. */
const smoothPath = (points: readonly Point[]) =>
  points
    .slice(1)
    .map((point, index) => {
      const p0 = points[index - 1] ?? points[index] ?? point;
      const p1 = points[index] ?? point;
      const p3 = points[index + 2] ?? point;
      return `C${fixed(p1[0] + (point[0] - p0[0]) / 6)} ${fixed(p1[1] + (point[1] - p0[1]) / 6)} ${fixed(point[0] - (p3[0] - p1[0]) / 6)} ${fixed(point[1] - (p3[1] - p1[1]) / 6)} ${fixed(point[0])} ${fixed(point[1])}`;
    })
    .join("");

interface FlameOutline {
  /** One closed path per entry of `FLAME_LAYERS`, outer first. */
  readonly layers: readonly string[];
  /** Licks torn off above the flames, as one path. */
  readonly licks: string;
  /** Height of the outer edge above each column, for placing embers. */
  readonly top: (x: number) => number;
}

/**
 * Traces the shader's still frame: up each column of the box, the height
 * where the heat first drops below each layer's level, and any lick that
 * burns again above the flame. Neighbouring columns join into smooth
 * outlines, so tongues keep the shader's uneven spacing, curved sides and
 * shared bases, and each inner layer follows its own contour.
 */
const traceFlames = (shape: FlameShape): FlameOutline => {
  const columns = Math.max(24, Math.round(shape.aspect * 72));
  const step = 1 / FLAME_ROWS;
  const tops = FLAME_LAYERS.map((): number[] => []);
  const islands: ({ low: number; high: number } | null)[] = [];
  for (let column = 0; column < columns; column += 1) {
    const bx = (column / (columns - 1) - 0.5) * shape.aspect;
    const heats = Array.from({ length: FLAME_ROWS + 1 }, (_, row) =>
      flameHeat(bx, row * step, shape)
    );
    // Where the heat first falls below `level`, between two samples.
    const crossing = (level: number) => {
      const row = heats.findIndex((heat) => heat < level);
      if (row <= 0) {
        return row === 0 ? 0 : 1;
      }
      const above = heats[row] ?? level;
      const below = heats[row - 1] ?? level;
      return (row - 1 + (below - level) / (below - above)) * step;
    };
    for (const [index, layer] of FLAME_LAYERS.entries()) {
      tops[index]?.push(crossing(layer.heat));
    }
    // One lick per column at most: the first run of heat above zero over
    // the flame's edge. A lick that nearly touches the flame joins it.
    const edge = Math.ceil((tops[0]?.at(-1) ?? 1) / step);
    const start = heats.findIndex((heat, row) => row > edge && heat > 0);
    const end =
      start === -1
        ? -1
        : heats.findIndex((heat, row) => row > start && heat <= 0);
    const high = (end < 0 ? FLAME_ROWS : end) * step;
    const low = (start - 0.5) * step;
    if (start !== -1 && start - edge <= 2) {
      tops[0]?.splice(-1, 1, high);
      islands.push(null);
    } else {
      islands.push(start === -1 ? null : { high, low });
    }
  }
  const xAt = (column: number) => (column / (columns - 1)) * shape.aspect;
  const layers = tops.map((heights) => {
    // Fill notches one column wide, which the dither would show as a
    // scratch, not a gap, then soften the outline a little.
    const filled = heights.map((y, column) =>
      Math.max(y, Math.min(heights[column - 1] ?? y, heights[column + 1] ?? y))
    );
    const points = filled.map(
      (y, column): Point => [
        xAt(column),
        1 - ((filled[column - 1] ?? y) + 2 * y + (filled[column + 1] ?? y)) / 4,
      ]
    );
    const [first] = points;
    return first
      ? `M0 1.01L${fixed(first[0])} ${fixed(first[1])}${smoothPath(points)}L${fixed(shape.aspect)} 1.01Z`
      : "";
  });
  // Neighbouring columns with a lick join into one; a lick under three
  // columns wide is a sliver the dither would barely show, so it is left
  // out.
  const licks: string[] = [];
  let run: { column: number; low: number; high: number }[] = [];
  const close = () => {
    if (run.length > 2) {
      const upper = run.map(
        ({ column, high }): Point => [xAt(column), 1 - high]
      );
      const lower = run
        .toReversed()
        .map(({ column, low }): Point => [xAt(column), 1 - low]);
      const [first] = upper;
      const [turn] = lower;
      if (first && turn) {
        licks.push(
          `M${fixed(first[0])} ${fixed(first[1])}${smoothPath(upper)}L${fixed(turn[0])} ${fixed(turn[1])}${smoothPath(lower)}Z`
        );
      }
    }
    run = [];
  };
  for (const [column, island] of islands.entries()) {
    const last = run.at(-1);
    if (
      !island ||
      (last && (island.low > last.high || island.high < last.low))
    ) {
      close();
    }
    if (island) {
      run.push({ column, ...island });
    }
  }
  close();
  const outer = tops[0] ?? [];
  return {
    layers,
    licks: licks.join(""),
    top: (x) =>
      outer[
        clamp(Math.round((x / shape.aspect) * (columns - 1)), 0, columns - 1)
      ] ?? 0,
  };
};

/** Embers per unit of `embers` across a 16:9 box. */
const EMBERS_PER_UNIT = 9;

/**
 * A static SVG stand-in shown without WebGL: the shader's own still frame,
 * traced. The flames are three nested layers from the tip colour to the
 * core colour, each following the contour of its own heat, with the licks
 * torn off above them and embers clear of them, in the same colours.
 */
const FireFallback = ({
  palette,
  height,
  scale,
  spread,
  wind,
  embers,
  edge,
  intensity,
  time,
}: {
  palette: DitherPalette;
  height: number;
  scale: number;
  spread: number;
  wind: number;
  embers: number;
  edge: FireEdge;
  intensity: number;
  time: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const box = useBoxSize(ref) ?? FIRST_BOX;
  const id = useId().replaceAll(/[^\w-]/g, "");
  const aspect = box.width / box.height;
  const paper = cssColor(palette[0]);
  const inks = palette.slice(1).map(cssColor);
  const ink = inks.at(-1) ?? paper;
  const mono = inks.length === 1;
  const inkAt = (level: number) =>
    inks[Math.round(level * (inks.length - 1))] ?? ink;
  const outline = useMemo(
    () => traceFlames({ aspect, height, scale, spread, time, wind }),
    [aspect, height, scale, spread, time, wind]
  );
  const embered = Array.from(
    { length: Math.round(EMBERS_PER_UNIT * embers * (aspect / (16 / 9))) },
    (_, index) => {
      const age = fallbackHash(index, 6);
      const across = (fallbackHash(index, 5) - 0.5) * spread * 0.85;
      const rise = height * (0.5 + 1.2 * age);
      const x = aspect * (0.5 + across) + wind * 0.22 * rise;
      return { age, key: index, rise, x };
    }
  ).filter(
    (ember) => ember.rise < 0.99 && ember.rise > outline.top(ember.x) + 0.04
  );
  // An ember about five CSS pixels across, in box heights.
  const emberRadius = 2.5 / box.height;
  const half = (spread * aspect) / 2;
  return (
    <div
      ref={ref}
      className="absolute inset-0"
      style={{ backgroundColor: paper }}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 size-full"
        viewBox={`0 0 ${fixed(aspect)} 1`}
        preserveAspectRatio="none"
        style={{ opacity: intensity }}
      >
        <defs>
          {FLAME_LAYERS.map((layer, index) => (
            <linearGradient
              key={layer.level}
              id={`${id}-layer-${index}`}
              gradientUnits="userSpaceOnUse"
              x1="0"
              x2="0"
              y1="1"
              y2={fixed(1 - height * (1.1 - layer.heat * 0.6))}
            >
              <stop
                offset="0"
                style={{
                  stopColor: inkAt(layer.level),
                  stopOpacity: mono ? layer.mono : layer.multi,
                }}
              />
              <stop
                offset="1"
                style={{
                  stopColor: inkAt(layer.level),
                  stopOpacity: (mono ? layer.mono : layer.multi) * 0.7,
                }}
              />
            </linearGradient>
          ))}
          {/* A soft glow over the fire, an ellipse resting on the edge. */}
          <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
            <stop
              offset="0"
              style={{ stopColor: inkAt(0), stopOpacity: 0.2 }}
            />
            <stop offset="1" style={{ stopColor: inkAt(0), stopOpacity: 0 }} />
          </radialGradient>
        </defs>
        <g transform={edge === "top" ? "matrix(1 0 0 -1 0 1)" : undefined}>
          <ellipse
            cx={fixed(aspect / 2)}
            cy="1"
            rx={fixed(spread >= 0.85 ? aspect * 0.75 : half * 1.3)}
            ry={fixed(height * 1.1)}
            fill={`url(#${id}-glow)`}
          />
          <path
            d={outline.licks}
            fill={`url(#${id}-layer-0)`}
            opacity={mono ? 0.8 : 1}
          />
          {FLAME_LAYERS.map((layer, index) => (
            <path
              key={layer.level}
              d={outline.layers[index]}
              fill={`url(#${id}-layer-${index})`}
            />
          ))}
          {embered.map((ember) => (
            <circle
              key={ember.key}
              cx={fixed(ember.x)}
              cy={fixed(1 - ember.rise)}
              r={fixed(emberRadius)}
              style={{ fill: inkAt(1 - ember.age) }}
              opacity={fixed(1 - 0.5 * ember.age)}
            />
          ))}
        </g>
      </svg>
    </div>
  );
};

/**
 * Flames rising from the edge of the box, drawn as a dither: a hot, dense
 * base, tapering tongues that lick up, split and tear off, and embers that
 * drift up above them and wink out. The palette runs as a heat ramp, from
 * the tips to the base. Decorative and full-bleed: size it with
 * `className`, usually `absolute inset-0`.
 */
export const Fire = ({
  height = 0.55,
  scale = 1,
  spread = 1,
  wind = 0.15,
  embers = 1,
  intensity = 1,
  edge = "bottom",
  palette = FIRE_PALETTE,
  stillTime = 6,
  ...props
}: FireProps) => {
  const reach = clamp(height, 0.1, 1);
  const tongues = clamp(scale, 0.3, 3);
  const burning = clamp(spread, 0.1, 1);
  const lean = clamp(wind, -1, 1);
  const sparks = clamp(embers, 0, 3);
  const peak = clamp(intensity, 0, 1);
  return (
    <DitherShader
      {...props}
      field={FIELD}
      colorField={COLOR_FIELD}
      palette={palette}
      stillTime={stillTime}
      uniforms={{
        fireEdge: edge === "top" ? 1 : 0,
        fireEmbers: sparks,
        fireHeight: reach,
        fireInks: palette.length - 2,
        fireIntensity: peak,
        fireScale: tongues,
        fireSpread: burning,
        fireWind: lean,
      }}
      fallback={
        <FireFallback
          palette={palette}
          height={reach}
          scale={tongues}
          spread={burning}
          wind={lean}
          embers={sparks}
          edge={edge}
          intensity={peak}
          time={stillTime}
        />
      }
    />
  );
};
