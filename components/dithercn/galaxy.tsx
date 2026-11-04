"use client";

import { useId } from "react";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

/** A point in the box: x from the left, y from the top, both 0 to 1. */
export type GalaxyPoint = readonly [number, number];

/** Which way the disc turns on screen. The arms always trail. */
export type GalaxyDirection = "clockwise" | "counterclockwise";

export type GalaxyProps = Omit<
  DitherShaderProps,
  "field" | "colorField" | "uniforms" | "fallback"
> & {
  /** How many spiral arms, 2 to 5. Default 2. */
  arms?: number;
  /** How tightly the arms wind, 0.3 (open) to 2 (tight). Default 1. */
  twist?: number;
  /** How far the disc leans away, in degrees: 0 is face-on, 80 nearly edge-on. Default 55. */
  tilt?: number;
  /** Direction of the disc's long axis, in degrees as in CSS: 0 is up, 90 right. Default 70. */
  angle?: number;
  /** Which way the disc turns. Default `"clockwise"`. */
  direction?: GalaxyDirection;
  /** Centre of the galaxy. Default `[0.5, 0.5]`. */
  center?: GalaxyPoint;
  /** Radius of the disc as a share of the box's shorter side. Default 0.46. */
  size?: number;
  /** Strength of the dark dust lanes, 0 to 1. Default 0.8. */
  dust?: number;
  /** How many background stars, 0 to 3. Default 1. */
  stars?: number;
  /**
   * Colour the dots by place instead of brightness: the last palette
   * colour at the core, the first ink colour along the arms, and a random
   * one for each background star. Give it three or more colours, such as
   * `["--dither-paper", "blue", "orange"]`. Default `false`.
   */
  colorField?: boolean;
};

/**
 * Geometry shared by both shader functions. The engine keeps one copy of a
 * definition that appears word for word in `field` and `colorField`.
 */
const GEOMETRY = `
// The cell relative to the centre, in disc radii, turned so the long axis
// runs along x. y is still foreshortened by the tilt.
vec2 galaxyView(vec2 uv, vec2 res) {
  float aspect = res.x / res.y;
  vec2 q = (uv - vec2(galaxyCenter.x, 1.0 - galaxyCenter.y)) * vec2(aspect, 1.0);
  q /= galaxySize * min(aspect, 1.0);
  float a = radians(galaxyAngle);
  return vec2(dot(q, vec2(sin(a), cos(a))), dot(q, vec2(-cos(a), sin(a))));
}

// Distance from the centre of the bulge, which stays rounder than the disc.
float galaxyBulgeRadius(vec2 v) {
  return length(vec2(v.x, v.y / mix(1.0, galaxyCos, 0.4)));
}

// 1 on the cell of a background star, else 0. Fixed to the screen.
float galaxyStar(vec2 uv, vec2 res) {
  vec2 cell = floor(uv * res);
  float seed = hash21(vec2(hash21(cell), hash21(cell.yx + 31.7)) * 97.0);
  return step(1.0 - 0.0016 * galaxyStars, seed);
}
`;

const FIELD = `${GEOMETRY}
// Angular speed of the stars at radius r: a flat rotation curve, so the
// inner disc turns faster than the outer.
float galaxyOmega(float r) {
  return 0.075 / (r + 0.15);
}

mat2 galaxyTurn(float a) {
  return mat2(cos(a), sin(a), -sin(a), cos(a));
}

// The disc's texture (x: dust clumps in [0, 1], y: star knots in [-1, 1]),
// carried round by differential rotation. Two copies are sheared for ten
// seconds each and reset while invisible, then cross-faded, so the inner
// disc runs ahead of the outer without the texture ever winding up.
vec2 galaxyTexture(vec2 g, float r, float t) {
  vec2 sum = vec2(0.0);
  float norm = 0.0;
  for (int i = 0; i < 2; i++) {
    float phase = t * 0.1 + float(i) * 0.5;
    float age = fract(phase);
    float weight = 1.0 - abs(2.0 * age - 1.0);
    float turn = 0.045 * t + (galaxyOmega(r) - 0.045) * age * 10.0;
    vec2 m = galaxyTurn(turn) * g + floor(phase) * vec2(7.3, 3.1) + float(i) * vec2(19.1, 5.7);
    float clumps = 0.65 * snoise(m * 2.6) + 0.35 * snoise(m * 6.1);
    sum += weight * vec2(clumps, snoise(m * 11.0));
    norm += weight * weight;
  }
  // Divide by the root of the summed squares, so the noise keeps its
  // contrast through the cross-fade instead of dimming every five seconds.
  sum /= sqrt(max(norm, 1e-4));
  return vec2(0.5 + 0.5 * sum.x, sum.y);
}

float field(vec2 uv, vec2 res, float t) {
  vec2 v = galaxyView(uv, res);
  // Into the plane of the disc. Mirroring x flips the spiral and the spin.
  vec2 g = vec2(v.x * galaxySpin, v.y / galaxyCos);
  float r = length(g);
  float theta = atan(g.y, g.x);

  // The arms: a logarithmic spiral that turns as one piece, slower than
  // the stars, with a gentle wobble that turns with it.
  float turn = 0.045 * t;
  float wobble = snoise(galaxyTurn(turn) * g * 1.8 + vec2(3.7, 1.9));
  float psi = galaxyArms * (theta + turn - galaxyTwist * 2.1 * log(r + 0.03)) + wobble * 0.35;
  float wave = 0.5 + 0.5 * cos(psi);
  float arm = pow(wave, 10.0);
  float sheen = wave * wave * wave;
  // Dust lanes run along the inner flank of each arm, a little ahead in
  // phase, where there is light behind them to block.
  float lane = pow(0.5 + 0.5 * cos(psi - 0.45), 10.0);

  vec2 tex = galaxyTexture(g, r, t);
  float inner = smoothstep(0.08, 0.34, r);
  float outer = 1.0 - smoothstep(0.75, 1.3, r);
  float disc = exp(-r * 0.75) * outer;
  // The arms fade outwards more slowly than the light between them.
  float ridge = 1.05 * arm * exp(-r * 0.4) * outer + 0.22 * sheen * disc;
  float tone = (0.01 * disc + ridge * inner) * (0.75 + 0.5 * tex.x);

  // Knots of young stars, only on the arms.
  float knots = smoothstep(0.45, 0.85, tex.y) * sqrt(arm) * inner * (1.0 - smoothstep(0.7, 1.1, r));
  tone += knots * 0.6 * disc;

  // Dust: lanes along the arms, and a dusty ring whose near half, seen at
  // a slant, lies in front of the bulge and the far side of the disc.
  float clumps = smoothstep(0.25, 0.65, tex.x);
  float absorb = lane * clumps * smoothstep(0.06, 0.2, r) * outer * galaxyDust;
  // It only shows once the disc leans well over, past about 50 degrees.
  // (smoothstep needs ascending edges, so the near half is 1 minus it.)
  float slant = 1.0 - galaxyCos;
  float near = (1.0 - smoothstep(-0.04, 0.0, g.y)) * smoothstep(0.35, 0.8, slant);
  float ring = smoothstep(0.1, 0.28, r) * (1.0 - smoothstep(0.6, 0.95, r));
  ring *= (0.75 + 0.25 * clumps) * galaxyDust;
  float veil = clamp(absorb + near * ring, 0.0, 0.95);

  // Nearly edge-on, the line of sight runs through far more dust, and the
  // dense inner ring on the near side reads as one crisp dark lane across
  // the core, as in the Sombrero galaxy, with bulge light on both sides of
  // it. It fades in from about 60 degrees, so the default tilt and anything
  // flatter look as before. The lane follows the near half of a dust ring
  // of radius 0.18: an arc through the lower core that meets the long axis
  // past the bulge. Its width is set on screen, at least a few dots, so it
  // stays crisp however flat the disc or small the box.
  float edgeOn = smoothstep(0.5, 0.85, slant);
  float across = abs(v.x);
  float laneY = -galaxyCos * sqrt(max(0.0324 - across * across, 0.0));
  float cellSize = 1.0 / (galaxySize * min(res.x, res.y));
  float laneD = abs(v.y - laneY) / max(0.022 + 0.07 * galaxyCos, 1.75 * cellSize);
  float midplane = 1.0 - smoothstep(0.55, 1.0, laneD);
  midplane *= (1.0 - smoothstep(0.34, 0.7, across)) * (0.9 + 0.1 * clumps);
  float band = clamp(edgeOn * midplane * galaxyDust * 1.2, 0.0, 0.97);
  tone *= (1.0 - veil) * (1.0 - band);

  // The bulge, crossed by the lanes that spiral into it. Seen at a slant,
  // the near half of the dusty disc also cuts a band across it. Edge-on,
  // that broad veil gives way to the thin lane, so the bulge still glows
  // below it.
  float rb = galaxyBulgeRadius(v);
  float bulge = 0.7 * exp(-rb * rb * 70.0) + 0.45 * exp(-rb * rb * 11.0);
  bulge *= (1.0 - veil * (1.0 - edgeOn)) * (1.0 - band);

  // A faint round halo.
  float halo = 0.05 * exp(-rb * 3.0) * (1.0 - smoothstep(0.8, 1.6, rb));
  float glow = tone + bulge + halo;

  // No background stars show through the dark lane either.
  float star = galaxyStar(uv, res) * (1.0 - smoothstep(0.04, 0.2, glow)) * (1.0 - band);
  return max(clamp(glow, 0.0, 1.0), star);
}
`;

const COLOR_FIELD = `${GEOMETRY}
vec3 colorField(vec2 uv, vec2 res, float t) {
  vec2 v = galaxyView(uv, res);
  float rb = galaxyBulgeRadius(v);
  // Last palette colour at the core, first ink colour on the arms. Each
  // dot takes one palette colour, picked by a fixed per-cell threshold, so
  // the colours mix as dots instead of blending into a muddy in-between.
  float warmth = 1.0 - smoothstep(0.03, 0.42, rb);
  float star = galaxyStar(uv, res) * smoothstep(0.5, 0.9, rb);
  vec2 cell = floor(uv * res);
  float x = mix(warmth, hash21(cell + 5.1), star) * galaxyInks;
  float pick = floor(x) + step(hash21(cell.yx + 17.3), fract(x));
  return paletteColor(pick / max(galaxyInks, 1.0)).rgb;
}
`;

const DEFAULT_PALETTE: DitherPalette = ["--dither-paper", "--dither-ink"];

const CENTRE: GalaxyPoint = [0.5, 0.5];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** GLSL's smoothstep, for the fallback's profiles. */
const smooth = (lo: number, hi: number, x: number) => {
  const t = clamp((x - lo) / (hi - lo), 0, 1);
  return t * t * (3 - 2 * t);
};

const fixed = (value: number) => value.toFixed(3);

/** Half the side of the fallback's square, in disc radii. */
const EXTENT = 1.35;

/** Points along each side of an arm. The spiral is denser near the core. */
const ARM_STEPS = 72;
const ARM_INNER = 0.06;
const ARM_OUTER = 1.3;

/**
 * Soft arms as stacked ribbons, widest and faintest first. `width` is the
 * half-width in the shader's arm phase (its crest is half as bright 0.52
 * away), `alpha` the share of the arm's brightness each ribbon adds, and
 * `level` how bright the arm is at the ribbon's edge, which picks its
 * colour from a palette of three or more.
 */
const ARM_LAYERS = [
  { alpha: 0.2, level: 0.3, width: 1.2 },
  { alpha: 0.35, level: 0.65, width: 0.75 },
  { alpha: 0.75, level: 1, width: 0.38 },
] as const;

/** Radii where the fallback's gradients sample the shader's profiles. */
const PROFILE_STOPS = [
  0, 0.04, 0.08, 0.12, 0.17, 0.22, 0.28, 0.34, 0.42, 0.5, 0.6, 0.7, 0.8, 0.9, 1,
  1.1, 1.2, 1.3,
];

/**
 * Brightness of an arm's crest at radius `r`, as in `field`. Sparse dots
 * still trace a line where the same share of smooth paint fades out, so
 * the fallback lifts the faint ends of each arm.
 */
const armTone = (r: number) =>
  Math.min(
    1,
    1.05 *
      Math.exp(-r * 0.4) *
      (1 - smooth(0.75, 1.3, r)) *
      smooth(0.08, 0.34, r)
  ) ** 0.8;

/** The faint light of the disc between the arms. */
const discTone = (r: number) =>
  0.24 * Math.exp(-r * 0.75) * (1 - smooth(0.6, 1.15, r));

/**
 * Brightness of the bulge at bulge radius `r`, as in `field`. Its faint
 * outskirts are sparse dots in the shader, which leave the inner arms
 * clear, but a smooth glow would fill the gap, so the fallback dims them.
 */
const bulgeTone = (r: number) =>
  Math.min(
    1,
    0.7 * Math.exp(-r * r * 70) +
      0.45 * Math.exp(-r * r * 11) +
      0.05 * Math.exp(-r * 3) * (1 - smooth(0.8, 1.6, r))
  ) ** 1.6;

/** Strength of the dust lane along an arm at radius `r`. */
const laneTone = (r: number) =>
  smooth(0.06, 0.2, r) * (1 - smooth(0.75, 1.3, r));

/** Strength of the dusty ring at radius `r`. */
const ringTone = (r: number) =>
  smooth(0.1, 0.28, r) * (1 - smooth(0.6, 0.95, r));

/**
 * The outline of one arm: the shader's logarithmic spiral, widened by
 * `width` radians either side of its crest and thinned at the tip. Drawn
 * in the plane of the disc, x along the long axis, y down the screen.
 */
const armPath = ({
  phase,
  twist,
  width,
  spin,
}: {
  phase: number;
  twist: number;
  width: number;
  spin: number;
}) => {
  const side = (sign: number) =>
    Array.from({ length: ARM_STEPS + 1 }, (_, step) => {
      const r = ARM_INNER * (ARM_OUTER / ARM_INNER) ** (step / ARM_STEPS);
      const taper = 1 - 0.55 * smooth(0.8, ARM_OUTER, r);
      const theta =
        twist * 2.1 * Math.log(r + 0.03) + phase + sign * width * taper;
      return `${fixed(spin * r * Math.cos(theta))} ${fixed(-r * Math.sin(theta))}`;
    });
  return `M${side(1).join("L")}L${side(-1).toReversed().join("L")}Z`;
};

/** Half the length of the edge-on lane, along the long axis. */
const LANE_REACH = 0.4;

/**
 * The edge-on lane: the near half of a dust ring of radius 0.18, as in
 * `field`, as it crosses the bulge.
 */
const lanePath = (squash: number) =>
  `M${Array.from({ length: 25 }, (_, step) => {
    const x = LANE_REACH * (step / 12 - 1);
    return `${fixed(x)} ${fixed(squash * Math.sqrt(Math.max(0.0324 - x * x, 0)))}`;
  }).join("L")}`;

/**
 * A fixed scatter of background stars, as fractions of the box. A
 * low-discrepancy sequence spreads any first few evenly, and a seeded
 * jitter keeps them from lining up.
 */
const STARS = Array.from({ length: 120 }, (_, index) => {
  const jitter = (salt: number) => {
    const s = Math.sin(index * 127.1 + salt * 311.7) * 43_758.5453;
    return s - Math.floor(s);
  };
  const n = index + 1;
  return {
    bright: jitter(3) > 0.6,
    pick: jitter(4),
    x: (0.5 + n * 0.754_877_666_2 + 0.06 * (jitter(1) - 0.5)) % 1,
    y: (0.5 + n * 0.569_840_291 + 0.06 * (jitter(2) - 0.5)) % 1,
  };
});

/** Background stars per unit of `stars`. */
const STARS_PER_UNIT = 36;

/**
 * A static SVG stand-in shown without WebGL: the same tilted disc with one
 * logarithmic spiral per arm, soft and fading outwards, dust along their
 * inner edges, a bright bulge and a fixed scatter of stars, in the same
 * colours.
 */
const GalaxyFallback = ({
  palette,
  center,
  size,
  tilt,
  angle,
  arms,
  twist,
  spin,
  turn,
  dust,
  colorField,
  stars,
}: {
  palette: DitherPalette;
  center: GalaxyPoint;
  size: number;
  tilt: number;
  angle: number;
  arms: number;
  twist: number;
  spin: number;
  turn: number;
  dust: number;
  colorField: boolean;
  stars: number;
}) => {
  const id = useId().replaceAll(/[^\w-]/g, "");
  const paper = cssColor(palette[0]);
  const inks = palette.slice(1).map(cssColor);
  const ink = inks.at(-1) ?? paper;
  const between = (low: number, share: number) =>
    `color-mix(in oklab, ${inks[low]}, ${inks[low + 1]} ${(share * 100).toFixed(0)}%)`;
  // The dots a tone of `tone` paints at radius `r`, as the engine picks
  // them. By default a tone covers a share of the dots that grows with the
  // number of inks and steps through them from first to last. With
  // colorField it covers its own share, coloured by place: the first ink
  // on the arms, the last at the core. Dots of two colours side by side
  // still read as both, but painted they average to grey, so the fallback
  // takes the nearer ink by tone, and blends by place over a narrower ring
  // than the shader.
  const paint = (tone: number, r: number, level = 1) => {
    if (colorField) {
      const warmth = (1 - smooth(0.04, 0.3, r)) * (inks.length - 1);
      const low = Math.min(Math.floor(warmth), inks.length - 2);
      return {
        color: low < 0 ? ink : between(low, warmth - low),
        opacity: clamp(tone, 0, 1),
      };
    }
    const scaled = clamp(level * tone, 0, 1) * inks.length - 1;
    return {
      color: inks[clamp(Math.round(scaled), 0, inks.length - 1)] ?? ink,
      opacity: clamp(tone * inks.length, 0, 1),
    };
  };
  const squash = Math.max(0.17, Math.cos((tilt * Math.PI) / 180));
  const slant = 1 - squash;
  const edgeOn = smooth(0.5, 0.85, slant);
  const veil = smooth(0.35, 0.8, slant) * dust * 0.85;
  // Painted, a dark lane reads stronger than the same gap in the dots, so
  // the fallback's is a little lighter and shorter than the shader's.
  const band = clamp(edgeOn * dust * 1.2, 0, 0.97) * 0.85;
  // Seen edge-on, the lanes along the arms pile up on the long axis into
  // one hard seam, so they give way to the lane across the core.
  const lanes = 0.4 * dust * (1 - 0.75 * edgeOn);
  const scale = (outer: number, tone: (r: number) => number, level = 1) =>
    PROFILE_STOPS.filter((r) => r <= outer).map((r) => {
      const { color, opacity } = paint(tone(r), r, level);
      return (
        <stop
          key={r}
          offset={fixed(r / outer)}
          style={{ stopColor: color, stopOpacity: fixed(opacity) }}
        />
      );
    });
  const paperScale = (outer: number, tone: (r: number) => number) =>
    PROFILE_STOPS.filter((r) => r <= outer).map((r) => (
      <stop
        key={r}
        offset={fixed(r / outer)}
        style={{ stopColor: paper, stopOpacity: fixed(tone(r)) }}
      />
    ));
  const phases = Array.from(
    { length: arms },
    (_, arm) => (2 * Math.PI * arm) / arms - turn
  );
  const width = `${(2 * EXTENT * size * 100).toFixed(1)}cqmin`;
  return (
    <div className="absolute inset-0" style={{ backgroundColor: paper }}>
      {stars > 0 && (
        <svg aria-hidden="true" className="absolute inset-0 size-full">
          {STARS.slice(0, Math.round(STARS_PER_UNIT * stars)).map((star) => (
            <circle
              key={`${star.x}-${star.y}`}
              cx={`${(star.x * 100).toFixed(2)}%`}
              cy={`${(star.y * 100).toFixed(2)}%`}
              r={star.bright ? 1.5 : 1}
              style={{
                fill: colorField
                  ? (inks[Math.floor(star.pick * inks.length)] ?? ink)
                  : ink,
              }}
              opacity={star.bright ? 1 : 0.7}
            />
          ))}
        </svg>
      )}
      <svg
        aria-hidden="true"
        className="absolute overflow-visible"
        viewBox={`${-EXTENT} ${-EXTENT} ${2 * EXTENT} ${2 * EXTENT}`}
        style={{
          height: width,
          left: `${(center[0] * 100).toFixed(1)}%`,
          top: `${(center[1] * 100).toFixed(1)}%`,
          transform: "translate(-50%, -50%)",
          width,
        }}
      >
        <defs>
          {ARM_LAYERS.map((layer, index) => (
            <radialGradient
              key={layer.width}
              id={`${id}-arm-${index}`}
              gradientUnits="userSpaceOnUse"
              cx="0"
              cy="0"
              r={ARM_OUTER}
            >
              {scale(ARM_OUTER, armTone, layer.level)}
            </radialGradient>
          ))}
          <radialGradient
            id={`${id}-disc`}
            gradientUnits="userSpaceOnUse"
            cx="0"
            cy="0"
            r={ARM_OUTER}
          >
            {scale(ARM_OUTER, discTone)}
          </radialGradient>
          <filter
            id={`${id}-soft`}
            x="-1.5"
            y="-1.5"
            width="3"
            height="3"
            filterUnits="userSpaceOnUse"
          >
            <feGaussianBlur stdDeviation="0.025" />
          </filter>
          <radialGradient
            id={`${id}-lane`}
            gradientUnits="userSpaceOnUse"
            cx="0"
            cy="0"
            r={ARM_OUTER}
          >
            {paperScale(ARM_OUTER, laneTone)}
          </radialGradient>
          <radialGradient
            id={`${id}-ring`}
            gradientUnits="userSpaceOnUse"
            cx="0"
            cy="0"
            r="1"
          >
            {paperScale(1, ringTone)}
          </radialGradient>
          <radialGradient
            id={`${id}-bulge`}
            gradientUnits="userSpaceOnUse"
            cx="0"
            cy="0"
            r="1"
          >
            {scale(1, bulgeTone)}
          </radialGradient>
          <linearGradient
            id={`${id}-near`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            x2="0"
            y1="-0.02"
            y2="0.2"
          >
            <stop offset="0" stopColor="#000" />
            <stop offset="1" stopColor="#fff" />
          </linearGradient>
          <mask
            id={`${id}-near-half`}
            maskUnits="userSpaceOnUse"
            x="-1.1"
            y="-1.1"
            width="2.2"
            height="2.2"
          >
            <rect
              x="-1.1"
              y="-1.1"
              width="2.2"
              height="2.2"
              fill={`url(#${id}-near)`}
            />
          </mask>
          <linearGradient
            id={`${id}-band`}
            gradientUnits="userSpaceOnUse"
            x1={-LANE_REACH}
            x2={LANE_REACH}
            y1="0"
            y2="0"
          >
            {[0, 0.15, 0.3, 0.5, 0.7, 0.85, 1].map((offset) => (
              <stop
                key={offset}
                offset={offset}
                style={{
                  stopColor: paper,
                  stopOpacity: fixed(
                    1 -
                      smooth(
                        0.12,
                        0.32,
                        Math.abs((2 * offset - 1) * LANE_REACH)
                      )
                  ),
                }}
              />
            ))}
          </linearGradient>
        </defs>
        <g transform={`rotate(${angle - 90})`}>
          <g transform={`scale(1 ${fixed(squash)})`}>
            <circle r={ARM_OUTER} fill={`url(#${id}-disc)`} />
            <g filter={`url(#${id}-soft)`}>
              {ARM_LAYERS.map((layer, index) =>
                phases.map((phase) => (
                  <path
                    key={`${layer.width}-${phase}`}
                    d={armPath({
                      phase,
                      spin,
                      twist,
                      width: layer.width / arms,
                    })}
                    fill={`url(#${id}-arm-${index})`}
                    opacity={layer.alpha}
                  />
                ))
              )}
              {lanes > 0 &&
                phases.map((phase) => (
                  <path
                    key={`lane-${phase}`}
                    d={armPath({
                      phase: phase + 0.45 / arms,
                      spin,
                      twist,
                      width: 0.3 / arms,
                    })}
                    fill={`url(#${id}-lane)`}
                    opacity={fixed(lanes)}
                  />
                ))}
            </g>
            {/* The near half of the dusty ring, softened at the long axis
                so it doesn't cut a hard line through the arms. */}
            {veil > 0.01 && (
              <circle
                r="1"
                fill={`url(#${id}-ring)`}
                mask={`url(#${id}-near-half)`}
                opacity={fixed(veil)}
              />
            )}
          </g>
          <circle
            r="1"
            fill={`url(#${id}-bulge)`}
            transform={`scale(1 ${fixed(0.6 + 0.4 * squash)})`}
          />
          {band > 0.01 && (
            <path
              d={lanePath(squash)}
              fill="none"
              stroke={`url(#${id}-band)`}
              strokeWidth={fixed(0.6 * (0.022 + 0.07 * squash))}
              opacity={fixed(band)}
            />
          )}
        </g>
      </svg>
    </div>
  );
};

/**
 * A spiral galaxy turning slowly: a bright bulge, logarithmic arms with
 * knots of stars, dust lanes along their inner edges, a faint halo and
 * fixed stars behind, seen as a tilted disc. The arms turn as one piece
 * while the stars stream through them, faster near the core, so the
 * spiral never winds up. Decorative and full-bleed: size it with
 * `className`, usually `absolute inset-0`.
 */
export const Galaxy = ({
  arms = 2,
  twist = 1,
  tilt = 55,
  angle = 70,
  direction = "clockwise",
  center = CENTRE,
  size = 0.46,
  dust = 0.8,
  stars = 1,
  colorField = false,
  palette = DEFAULT_PALETTE,
  matrix = "blue-noise",
  stillTime = 8,
  style,
  ...props
}: GalaxyProps) => {
  const armCount = Math.round(clamp(arms, 2, 5));
  const leaning = clamp(tilt, 0, 80);
  const spin = direction === "counterclockwise" ? -1 : 1;
  const winding = clamp(twist, 0.3, 2);
  const disc = Math.max(0.05, size);
  const dustiness = clamp(dust, 0, 1);
  return (
    <DitherShader
      {...props}
      field={FIELD}
      colorField={colorField ? COLOR_FIELD : undefined}
      matrix={matrix}
      palette={palette}
      stillTime={stillTime}
      style={{ containerType: "size", ...style }}
      uniforms={{
        galaxyAngle: angle,
        galaxyArms: armCount,
        galaxyCenter: center,
        galaxyCos: Math.max(0.17, Math.cos((leaning * Math.PI) / 180)),
        galaxyDust: dustiness,
        galaxyInks: palette.length - 2,
        galaxySize: disc,
        galaxySpin: spin,
        galaxyStars: clamp(stars, 0, 3),
        galaxyTwist: winding,
      }}
      fallback={
        <GalaxyFallback
          palette={palette}
          center={center}
          size={disc}
          tilt={leaning}
          angle={angle}
          arms={armCount}
          twist={winding}
          spin={spin}
          turn={0.045 * stillTime}
          dust={dustiness}
          colorField={colorField}
          stars={clamp(stars, 0, 3)}
        />
      }
    />
  );
};
