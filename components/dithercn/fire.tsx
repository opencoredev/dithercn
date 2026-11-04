"use client";

import { useEffect, useId, useRef, useState } from "react";

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

// The heat of the flames: above 0 inside a tongue, 1 at the base, 0 at
// the edge. Each column of the fire reaches up to its crown: inverted
// ridged noise along x, whose cusps give pointed, tapering tips, and which
// changes slowly so tongues grow, shrink and split. A wave running up the
// fire bends their upper parts from side to side, and noise scrolling
// upward faster than that tears licks off the tips and frays the edges.
float fireHeat(vec2 b, vec2 res, float t) {
  float reach = max(fireHeight, 0.05);
  float h = b.y / reach;
  float s = 2.8 * fireScale;
  // The tongues lean with the wind, further the higher they get.
  float x = b.x - fireWind * 0.22 * b.y * (0.6 + 0.8 * h);
  x += 0.1 / fireScale * h * snoise(vec2(x * s * 0.5 + 4.1, b.y * s * 0.6 - t * 0.9));
  float big = 1.0 - abs(snoise(vec2(x * s * 0.55, t * 0.32)));
  float small = 1.0 - abs(snoise(vec2(x * s * 1.25 + 9.1, t * 0.45 + 3.0)));
  float crown = 0.28 + 0.62 * big * big * big + 0.24 * small * small;
  float profile = fireProfile(b.x, res);
  crown *= mix(0.12, 1.0, profile);
  // Taller fires get taller licks, but less than in proportion, so a low
  // fire still has upright licks rather than squat blobs.
  vec2 q = vec2(x * s, b.y * s / (0.45 + 0.55 * reach));
  float lick = 0.65 * snoise(vec2(q.x * 1.1, q.y * 0.7 - t * 1.5))
    + 0.35 * snoise(vec2(q.x * 2.3, q.y * 1.5 - t * 2.6) + vec2(7.1, 2.3));
  // Past the sides of a gathered fire nothing burns, the bed included, and
  // the cut-off narrows with height so the blaze slopes in towards the top.
  return 1.0 - h / crown + lick * (0.08 + 0.34 * smoothstep(0.0, 0.7, h)) - (1.0 - profile) * (1.15 + 1.5 * h);
}

// Embers: one slot per 18 cells, in columns that rise at their own pace.
// Most slots are empty. An ember lights inside the flames, cools as it
// climbs, and winks out over half a second at a height of its own. age runs
// from 0 when it lights to 1 when it goes out.
float fireEmber(vec2 uv, vec2 res, float t, out float age) {
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
  return spot * present * life * glint * (1.0 - 0.4 * age);
}
`;

const FIELD = `${GEOMETRY}
float field(vec2 uv, vec2 res, float t) {
  vec2 b = fireBox(uv, res);
  float heat = fireHeat(b, res, t);
  // A crisp edge, then denser towards the hot core. The peak stops short of
  // solid ink so the dither still shows in the base.
  float flame = smoothstep(0.0, 0.04, heat) * mix(0.5, 0.92, smoothstep(0.04, 0.7, heat));
  float age;
  float ember = fireEmber(uv, res, t, age);
  return max(flame, ember) * fireIntensity;
}
`;

const COLOR_FIELD = `${GEOMETRY}
vec3 colorField(vec2 uv, vec2 res, float t) {
  vec2 b = fireBox(uv, res);
  float heat = fireHeat(b, res, t);
  float age;
  float ember = fireEmber(uv, res, t, age);
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

interface Tongue {
  /** Centre of the base, in box heights from the left. */
  readonly x: number;
  /** Half the width of the base, in box heights. */
  readonly half: number;
  /** Height of the tip above the edge, in box heights. */
  readonly tall: number;
  /** How far the tip sits to the side of the base, in box heights. */
  readonly lean: number;
  /** Seeds the tongue's shape and whether a lick tears off above it. */
  readonly seed: number;
}

/**
 * The tongues along the edge: one every `gap` box heights, of varied
 * heights, lower towards the sides of a fire with `spread` below 1, and
 * leaning with the wind as the shader's do.
 */
const fallbackTongues = ({
  aspect,
  height,
  scale,
  spread,
  wind,
}: {
  aspect: number;
  height: number;
  scale: number;
  spread: number;
  wind: number;
}): Tongue[] => {
  const gap = 0.15 / scale;
  const count = Math.ceil(aspect / gap) + 2;
  const half = Math.max((spread * aspect) / 2, 1e-3);
  return Array.from({ length: count }, (_, index): Tongue[] => {
    const x = (index - 0.5 + 0.5 * (fallbackHash(index, 1) - 0.5)) * gap;
    const across = (x - aspect / 2) / half;
    const profile =
      clamp(1 - across * across, 0, 1) * (1 - smooth(0.85, 1, spread)) +
      smooth(0.85, 1, spread);
    if (profile < 0.15) {
      return [];
    }
    // Alternate tall and short, with some jitter, so the crown never
    // reads as a row of equal teeth.
    const rank = index % 2 === 0 ? 0.62 : 0.42;
    const tall =
      height * (rank + 0.5 * fallbackHash(index, 2)) * (0.1 + 0.9 * profile);
    return [
      {
        half: gap * (0.62 + 0.3 * fallbackHash(index, 3)),
        lean: wind * 0.22 * tall * 1.2,
        seed: fallbackHash(index, 4),
        tall,
        x,
      },
    ];
  }).flat();
};

/**
 * One flame tongue as a closed path, in box heights with y down and the
 * edge at y = 1: an S-curve up each side to a pointed, leaning tip.
 * `width` and `length` shrink it for the inner layers.
 */
const tonguePath = (tongue: Tongue, width: number, length: number) => {
  const w = tongue.half * width;
  const h = tongue.tall * length;
  const tipX = tongue.x + tongue.lean * length;
  const tipY = 1 - h;
  const bend = (tongue.seed - 0.5) * w * 0.8;
  return [
    `M${fixed(tongue.x - w)} 1`,
    `C${fixed(tongue.x - w * 1.05)} ${fixed(1 - h * 0.38)} ${fixed(tipX - w * 0.15 + bend)} ${fixed(1 - h * 0.62)} ${fixed(tipX)} ${fixed(tipY)}`,
    `C${fixed(tipX + w * 0.3 + bend)} ${fixed(1 - h * 0.55)} ${fixed(tongue.x + w * 1.05)} ${fixed(1 - h * 0.42)} ${fixed(tongue.x + w)} 1`,
    "Z",
  ].join("");
};

/** A small lick torn off above a tongue: a sliver pointing up, leaning with it. */
const lickPath = (tongue: Tongue) => {
  const w = tongue.half * 0.16;
  const h = tongue.tall * 0.22;
  const x = tongue.x + tongue.lean * 1.3;
  const base = 1 - tongue.tall * 1.06;
  const tipX = x + tongue.lean * 0.4 + w * (tongue.seed - 0.5);
  return [
    `M${fixed(x - w)} ${fixed(base)}`,
    `C${fixed(x - w)} ${fixed(base - h * 0.45)} ${fixed(tipX - w * 0.2)} ${fixed(base - h * 0.75)} ${fixed(tipX)} ${fixed(base - h)}`,
    `C${fixed(tipX + w * 0.4)} ${fixed(base - h * 0.6)} ${fixed(x + w)} ${fixed(base - h * 0.35)} ${fixed(x + w)} ${fixed(base)}`,
    `C${fixed(x + w)} ${fixed(base + w * 0.7)} ${fixed(x - w)} ${fixed(base + w * 0.7)} ${fixed(x - w)} ${fixed(base)}`,
    "Z",
  ].join("");
};

/**
 * Nested flame layers, from the outer tongue in the first ink to the core
 * in the last. `level` places a layer on the ink ramp. With one ink, the
 * layers step up in opacity instead, as the shader's dots get denser.
 */
const FLAME_LAYERS = [
  { length: 1, level: 0, mono: 0.5, multi: 0.92, width: 1 },
  { length: 0.68, level: 0.5, mono: 0.72, multi: 0.95, width: 0.7 },
  { length: 0.38, level: 1, mono: 0.92, multi: 1, width: 0.44 },
] as const;

/** Embers per unit of `embers` across a 16:9 box. */
const EMBERS_PER_UNIT = 9;

/**
 * A static SVG stand-in shown without WebGL: the same row of leaning,
 * tapering tongues, each drawn as three nested layers from the tip colour
 * to the core colour, a hot band along the edge, a few torn-off licks and
 * embers above, in the same colours.
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
}: {
  palette: DitherPalette;
  height: number;
  scale: number;
  spread: number;
  wind: number;
  embers: number;
  edge: FireEdge;
  intensity: number;
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
  const tongues = fallbackTongues({ aspect, height, scale, spread, wind });
  const licks = tongues.filter((tongue) => tongue.seed > 0.7);
  const embered = Array.from(
    { length: Math.round(EMBERS_PER_UNIT * embers * (aspect / (16 / 9))) },
    (_, index) => {
      const age = fallbackHash(index, 6);
      const across = (fallbackHash(index, 5) - 0.5) * spread * 0.85;
      const rise = height * (0.5 + 1.2 * age);
      return {
        age,
        key: index,
        x: aspect * (0.5 + across) + wind * 0.22 * rise,
        y: 1 - rise,
      };
    }
  ).filter((ember) => ember.y > 0.01);
  // An ember about five CSS pixels across, in box heights.
  const emberRadius = 2.5 / box.height;
  const half = (spread * aspect) / 2;
  // Along a whole burning edge the hot bed runs off both sides of the box.
  const bed = spread >= 0.85 ? aspect / 2 + 0.05 : half * 0.92;
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
              y2={fixed(1 - height * layer.length * 1.1)}
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
          {licks.map((tongue) => (
            <path
              key={`lick-${tongue.x}`}
              d={lickPath(tongue)}
              style={{ fill: inkAt(0) }}
              opacity={mono ? 0.4 : 0.75}
            />
          ))}
          {FLAME_LAYERS.map((layer, index) => (
            <path
              key={layer.level}
              d={tongues
                .map((tongue) => tonguePath(tongue, layer.width, layer.length))
                .join("")}
              fill={`url(#${id}-layer-${index})`}
            />
          ))}
          {/* The hot bed along the edge, in the core colour. */}
          <rect
            x={fixed(aspect / 2 - bed)}
            y={fixed(1 - height * 0.1)}
            width={fixed(bed * 2)}
            height={fixed(height * 0.1 + 0.01)}
            rx={fixed(height * 0.05)}
            style={{ fill: ink }}
            opacity={mono ? 0.9 : 1}
          />
          {embered.map((ember) => (
            <circle
              key={ember.key}
              cx={fixed(ember.x)}
              cy={fixed(ember.y)}
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
        />
      }
    />
  );
};
