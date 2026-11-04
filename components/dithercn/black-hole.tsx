"use client";

import { useId } from "react";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

/** A point in the box: x from the left, y from the top, both 0 to 1. */
export type BlackHolePoint = readonly [number, number];

/**
 * Which way the disk turns on screen. The side turning towards the viewer
 * is the brighter one: the right with `"clockwise"`, the left otherwise.
 */
export type BlackHoleDirection = "clockwise" | "counterclockwise";

export type BlackHoleProps = Omit<
  DitherShaderProps,
  "field" | "colorField" | "uniforms" | "fallback"
> & {
  /** How far the disk leans away, in degrees: 0 is face-on, 88 nearly edge-on. Default 80. */
  tilt?: number;
  /** Direction of the disk's long axis, in degrees as in CSS: 0 is up, 90 right. Default 90. */
  angle?: number;
  /** Which way the disk turns, and so which side is brighter. Default `"clockwise"`. */
  direction?: BlackHoleDirection;
  /** Centre of the black hole. Default `[0.5, 0.5]`. */
  center?: BlackHolePoint;
  /** Radius of the accretion disk as a share of the box's shorter side. The shadow is about a quarter of it. Default 0.5. */
  size?: number;
  /** Brightness of the accretion disk, 0 (only the shadow, the photon ring and the stars) to 1.5. Default 1. */
  disk?: number;
  /** How many background stars, 0 to 3. Default 1. */
  stars?: number;
  /**
   * Colour the dots by temperature instead of brightness: the last palette
   * colour on the photon ring and the hot inner disk, the first ink colour
   * at the cool rim, and a random one for each star. Give it three or more
   * colours, such as `["--dither-paper", "red", "orange", "--dither-ink"]`.
   * Default `false`.
   */
  colorField?: boolean;
};

/** Radius of the shadow, in disk radii. */
const SHADOW = 0.27;
/** The inner edge of the disk, where it is hottest. */
const INNER = 0.36;
/** Radius of the photon ring, just outside the shadow. */
const RING = SHADOW * 1.02;
/** Where the lensed far side starts above the shadow, and the thin image below it. */
const ARC_INNER = SHADOW * 1.08;
const LOW_INNER = SHADOW * 1.05;
/** How tightly the lens packs the far side into the arc over the top, and under the bottom. */
const ARC_SQUEEZE = 0.46;
const LOW_SQUEEZE = 0.16;
/** Radius of the Einstein ring that bends the stars behind. */
const EINSTEIN = 0.42;
/** The disk's brightness turns into dot coverage as 1 - exp(-GAIN * light). */
const GAIN = 2.4;

const glsl = (value: number) => value.toFixed(4);

/**
 * Geometry shared by both shader functions. The engine keeps one copy of a
 * definition that appears word for word in `field` and `colorField`.
 */
const GEOMETRY = `
const float holeShadow = ${glsl(SHADOW)};
const float holeInner = ${glsl(INNER)};
const float holeRing = ${glsl(RING)};
const float holeEinstein = ${glsl(EINSTEIN)};

// The cell relative to the centre, in disk radii, turned so the disk's long
// axis runs along x. y points up, towards the far side of the disk.
vec2 holeView(vec2 uv, vec2 res) {
  float aspect = res.x / res.y;
  vec2 q = (uv - vec2(holeCenter.x, 1.0 - holeCenter.y)) * vec2(aspect, 1.0);
  q /= holeSize * min(aspect, 1.0);
  float a = radians(holeAngle);
  return vec2(dot(q, vec2(sin(a), cos(a))), dot(q, vec2(-cos(a), sin(a))));
}

// Brightness of the disk at radius r in its own plane: a crisp inner edge,
// hottest just outside it, fading out to the rim.
float holeProfile(float r) {
  float inner = smoothstep(holeInner - 0.02, holeInner + 0.025, r);
  float outer = 1.0 - smoothstep(0.5, 1.0, r);
  return inner * outer * pow(holeInner / max(r, holeInner), 1.8);
}

// Doppler beaming. c is the cosine of the angle round the disk from its
// right-hand end: the side turning towards the viewer is brighter, and the
// more edge-on the disk, the stronger the effect.
float holeBeam(float c) {
  float b = 1.0 + 0.38 * holeSpin * c * holeSin;
  return b * b * 0.85;
}

// The disk radius a cell shows, for each of the three images of the disk.
// The lens is faked in polar coordinates round the centre instead of
// tracing rays: x, the flat disk seen at a slant, its near half crossing in
// front of the shadow. y, the far half lensed up over the top of the
// shadow: at the horizon it is the flat disk, and towards the top the whole
// disk is packed into a band just outside the photon ring. z, a thinner
// image of the underside, packed under the bottom of the shadow.
vec3 holeRadii(vec2 v) {
  float rho = length(v);
  float rFlat = length(vec2(v.x, v.y / holeCos));
  float rise = smoothstep(0.0, 0.4, v.y / max(rho, 1e-4)) * holeLean;
  float rArc = holeInner + (rho - mix(holeInner, ${glsl(ARC_INNER)}, rise)) / mix(1.0, ${glsl(ARC_SQUEEZE)}, rise);
  float rLow = holeInner + (rho - ${glsl(LOW_INNER)}) / ${glsl(LOW_SQUEEZE)};
  return vec3(rFlat, rArc, rLow);
}

// A star behind the hole, as (brightness, a random number for its colour).
// Each cell is traced back through a point lens, so stars near the Einstein
// ring stretch into arcs round it and the ones behind the shadow show a
// second image on the far side. The sky drifts slowly sideways, so arcs
// swing round the ring as stars pass behind.
vec2 holeStar(vec2 v, float cell, float t) {
  vec2 source = v * (1.0 - holeEinstein * holeEinstein / max(dot(v, v), 1e-4));
  vec2 p = source / cell + vec2(t * 0.35 * holeSpin, 0.0);
  vec2 id = floor(p / 10.0);
  if (hash21(id + 3.1) > 0.14 * holeStars) {
    return vec2(0.0);
  }
  vec2 at = 1.5 + 7.0 * vec2(hash21(id + 7.1), hash21(id + 13.7));
  float d = length(p - id * 10.0 - at);
  float bright = 0.55 + 0.45 * hash21(id + 5.3);
  return vec2(bright * (1.0 - smoothstep(0.35, 0.9, d)), hash21(id + 11.9));
}
`;

const FIELD = `${GEOMETRY}
// Angular speed of the gas at radius r, in radians per second: Keplerian,
// so the inner disk turns several times faster than the rim.
float holeOmega(float r) {
  return 0.45 * pow(holeInner / max(r, holeInner), 1.5);
}

// Turbulent bands that stream round the disk, in [0, 1]. The noise is
// sampled on a circle per radius, so it wraps without a seam, and varies
// several times faster across the disk than along it, so it reads as
// streaks. Two copies are sheared for eight seconds each and reset while
// invisible, then cross-faded, so the inner disk runs ahead of the outer
// without the streaks ever winding up. detail adds a finer octave.
float holeBands(float r, float a, float t, float detail) {
  float sum = 0.0;
  float norm = 0.0;
  float base = holeOmega(0.55);
  for (int i = 0; i < 2; i++) {
    float phase = t * 0.125 + float(i) * 0.5;
    float age = fract(phase);
    float weight = 1.0 - abs(2.0 * age - 1.0);
    float turn = base * t + (holeOmega(r) - base) * age * 8.0;
    float b = a + holeSpin * turn;
    vec2 around = vec2(cos(b), sin(b));
    vec2 offset = floor(phase) * vec2(7.3, 3.1) + float(i) * vec2(19.1, 5.7);
    float n = snoise(around * 2.4 + vec2(r * 14.0, 0.0) + offset);
    if (detail > 0.0) {
      n = mix(n, snoise(around * 5.5 + vec2(r * 38.0, 0.0) + offset.yx), detail);
    }
    sum += weight * n;
    norm += weight * weight;
  }
  // Divide by the root of the summed squares, so the bands keep their
  // contrast through the cross-fade instead of dimming every four seconds.
  return clamp(0.5 + 0.55 * sum / sqrt(max(norm, 1e-4)), 0.0, 1.0);
}

float field(vec2 uv, vec2 res, float t) {
  vec2 v = holeView(uv, res);
  float rho = length(v);
  // One cell in disk radii, so the photon ring keeps a crisp width.
  float cell = 1.0 / (holeSize * min(res.x, res.y));
  vec3 radii = holeRadii(v);
  float facing = v.x / max(rho, 1e-4);

  // The flat disk seen at a slant, both halves at once.
  vec2 g = vec2(v.x, v.y / holeCos);
  float theta = atan(g.y, g.x);
  float flatLight = holeProfile(radii.x) * (0.45 + 0.9 * holeBands(radii.x, theta, t, 0.35)) * holeBeam(g.x / max(radii.x, 1e-4));
  float near = 1.0 - step(0.0, v.y);

  // The far side, lensed over the top of the shadow, and the thin image of
  // the underside below it, which fades out towards the horizon.
  float above = step(0.0, v.y);
  float arc = holeProfile(radii.y) * (0.45 + 0.9 * holeBands(radii.y, atan(v.y, v.x), t, 0.0)) * holeBeam(facing) * above;
  float under = sqrt(max(-v.y, 0.0) / max(rho, 1e-4)) * holeLean;
  float low = holeProfile(radii.z) * 0.6 * under * holeBeam(facing);

  // A faint glow of scattered light round the hole.
  float halo = 0.12 * exp(-max(rho - holeShadow, 0.0) * 14.0);

  // The photon ring: one thin, bright circle on the edge of the shadow.
  float ringD = (rho - holeRing) / max(0.008, 0.9 * cell);
  float ring = exp(-ringD * ringD) * 0.85 * mix(1.0, holeBeam(facing), 0.5);

  // Everything behind the hole stops at the edge of the shadow; the near
  // half of the disk crosses in front of it.
  float outside = smoothstep(holeShadow - 0.5 * cell, holeShadow + 0.5 * cell, rho);
  float behind = (max(max(flatLight * (1.0 - near), arc), low) + halo) * holeDisk * outside;
  float front = flatLight * near * holeDisk;
  float light = max(behind, front);
  float tone = max(1.0 - exp(-${glsl(GAIN)} * light), ring * outside);

  // Stars show only on clear sky.
  vec2 star = holeStar(v, cell, t);
  float sky = outside * (1.0 - smoothstep(0.03, 0.18, tone));
  return max(tone, star.x * sky);
}
`;

const COLOR_FIELD = `${GEOMETRY}
vec3 colorField(vec2 uv, vec2 res, float t) {
  vec2 v = holeView(uv, res);
  float rho = length(v);
  float cell = 1.0 / (holeSize * min(res.x, res.y));
  vec3 radii = holeRadii(v);
  float facing = v.x / max(rho, 1e-4);
  // The disk radius this cell shows: the near half of the flat disk sits in
  // front, else the hotter of the images behind.
  float behind = min(radii.x, v.y > 0.0 ? radii.y : radii.z);
  float r = v.y < 0.0 && radii.x < 1.0 ? radii.x : behind;
  // Hottest at the inner edge, on the photon ring, and on the side turning
  // towards the viewer.
  float heat = (1.0 - smoothstep(holeInner, 0.95, r)) * clamp(0.55 + 0.35 * holeBeam(facing), 0.0, 1.2);
  float ringD = (rho - holeRing) / max(0.012, 1.5 * cell);
  heat = clamp(max(heat, exp(-ringD * ringD)), 0.0, 1.0);
  // Stars, away from the light of the disk, each take one random colour.
  vec2 star = holeStar(v, cell, t);
  float clear = 1.0 - smoothstep(0.0, 0.04, holeProfile(r) * holeDisk);
  float starry = step(0.01, star.x) * clear * smoothstep(holeRing + 0.03, holeRing + 0.08, rho);
  // Each dot takes one palette colour, picked by a fixed per-cell
  // threshold, so the colours mix as dots instead of blending into a muddy
  // in-between.
  vec2 at = floor(uv * res);
  float x = mix(heat, star.y, starry) * holeInks;
  float pick = floor(x) + step(hash21(at.yx + 17.3), fract(x));
  return paletteColor(pick / max(holeInks, 1.0)).rgb;
}
`;

const DEFAULT_PALETTE: DitherPalette = ["--dither-paper", "--dither-ink"];

const CENTRE: BlackHolePoint = [0.5, 0.5];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const lerp = (from: number, to: number, share: number) =>
  from + (to - from) * share;

/** GLSL's smoothstep, for the fallback's profiles. */
const smooth = (lo: number, hi: number, x: number) => {
  const t = clamp((x - lo) / (hi - lo), 0, 1);
  return t * t * (3 - 2 * t);
};

const fixed = (value: number) => value.toFixed(4);

/** Brightness of the disk at radius `r`, as in `field`. */
const profile = (r: number) =>
  smooth(INNER - 0.02, INNER + 0.025, r) *
  (1 - smooth(0.5, 1, r)) *
  (INNER / Math.max(r, INNER)) ** 1.8;

/** Doppler beaming at cosine `c` round the disk, as in `field`. */
const beam = (c: number, spin: number, sin: number) =>
  (1 + 0.38 * spin * c * sin) ** 2 * 0.85;

/** How far the lens bends the far side up, from the tilt. */
const leanOf = (sin: number) => smooth(0.25, 0.9, sin);

/** Half the side of the fallback's square, in disk radii. */
const EXTENT = 1.1;

/**
 * The fallback draws the disk as concentric bands, each with its own
 * brightness, like the shader's turbulent streaks frozen in place.
 */
const BANDS = Array.from({ length: 16 }, (_, index) => {
  const s = Math.sin(index * 127.1 + 311.7) * 43_758.5453;
  const from = INNER + ((1 - INNER) * index) / 16;
  const to = INNER + ((1 - INNER) * (index + 1)) / 16;
  return { from, streak: 0.55 + 0.75 * (s - Math.floor(s)), to };
});

/** Points along each edge of a lensed band. */
const ARC_STEPS = 48;

/**
 * One band of the lensed far side, between disk radii `from` and `to`,
 * from the horizon on the right over the top of the shadow to the left.
 * Drawn with y down the screen.
 */
const arcBand = ({
  from,
  to,
  lean,
}: {
  from: number;
  to: number;
  lean: number;
}) => {
  const edge = (r: number) =>
    Array.from({ length: ARC_STEPS + 1 }, (_, step) => {
      const phi = (Math.PI * step) / ARC_STEPS;
      const rise = smooth(0, 0.4, Math.sin(phi)) * lean;
      const rho =
        lerp(INNER, ARC_INNER, rise) + (r - INNER) * lerp(1, ARC_SQUEEZE, rise);
      return `${fixed(rho * Math.cos(phi))} ${fixed(-rho * Math.sin(phi))}`;
    });
  return `M${edge(to).join("L")}L${edge(from).toReversed().join("L")}Z`;
};

/**
 * Half of one flat band, between radii `from` and `to`, drawn as a circle
 * and squashed by its group: `side` 1 is the near half below the centre,
 * -1 the far half above it.
 */
const flatBand = ({
  from,
  to,
  side,
}: {
  from: number;
  to: number;
  side: 1 | -1;
}) => {
  const out = side === 1 ? 0 : 1;
  const back = side === 1 ? 1 : 0;
  return `M${fixed(-to)} 0A${fixed(to)} ${fixed(to)} 0 0 ${out} ${fixed(to)} 0L${fixed(from)} 0A${fixed(from)} ${fixed(from)} 0 0 ${back} ${fixed(-from)} 0Z`;
};

/** The thin image of the underside, under the shadow, as one band. */
const LOW_OUTER = LOW_INNER + 0.2 * LOW_SQUEEZE;
const LOW_BAND = `M${fixed(-LOW_OUTER)} 0A${fixed(LOW_OUTER)} ${fixed(LOW_OUTER)} 0 0 0 ${fixed(LOW_OUTER)} 0L${fixed(LOW_INNER)} 0A${fixed(LOW_INNER)} ${fixed(LOW_INNER)} 0 0 1 ${fixed(-LOW_INNER)} 0Z`;

/**
 * Stars bent round the hole in the fallback: short arcs on the Einstein
 * ring, as angles in degrees from the right, clockwise, and lengths.
 */
const LENSED = [
  { at: -128, length: 34 },
  { at: -48, length: 18 },
  { at: 22, length: 26 },
  { at: 152, length: 14 },
] as const;

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
const STARS_PER_UNIT = 30;

/** The disk's light turned into dot coverage, as in `field`. */
const coverage = (light: number) => 1 - Math.exp(-GAIN * light);

/**
 * A static SVG stand-in shown without WebGL: the shadow, the photon ring,
 * the flat disk with its near half in front of the shadow, the far side
 * lensed over the top and a thin image under the bottom, brighter on the
 * side turning towards the viewer, with a fixed scatter of stars and a few
 * bent round the ring, in the same colours.
 */
const BlackHoleFallback = ({
  palette,
  center,
  size,
  tilt,
  angle,
  spin,
  disk,
  colorField,
  stars,
}: {
  palette: DitherPalette;
  center: BlackHolePoint;
  size: number;
  tilt: number;
  angle: number;
  spin: number;
  disk: number;
  colorField: boolean;
  stars: number;
}) => {
  const id = useId().replaceAll(/[^\w-]/g, "");
  const paper = cssColor(palette[0]);
  const inks = palette.slice(1).map(cssColor);
  const ink = inks.at(-1) ?? paper;
  const between = (low: number, share: number) =>
    `color-mix(in oklab, ${inks[low]}, ${inks[low + 1]} ${(share * 100).toFixed(0)}%)`;
  // The colour a band of coverage `tone` paints at disk radius `r`, as the
  // engine picks it. By default the tone steps through the inks from first
  // to last. With colorField the colour follows the heat instead: the
  // first ink at the rim, the last at the inner edge.
  const paint = (tone: number, r: number) => {
    if (colorField) {
      const heat = (1 - smooth(INNER, 0.95, r)) * (inks.length - 1);
      const low = Math.min(Math.floor(heat), inks.length - 2);
      return {
        color: low < 0 ? ink : between(low, heat - low),
        opacity: clamp(tone, 0, 1),
      };
    }
    const scaled = clamp(tone, 0, 1) * inks.length - 1;
    return {
      color: inks[clamp(Math.round(scaled), 0, inks.length - 1)] ?? ink,
      opacity: clamp(tone * inks.length, 0, 1),
    };
  };
  const radians = (tilt * Math.PI) / 180;
  const squash = Math.max(0.06, Math.cos(radians));
  const sin = Math.sin(radians);
  const lean = leanOf(sin);
  const bands = BANDS.map((band) => ({
    ...band,
    ...paint(
      coverage(profile((band.from + band.to) / 2) * band.streak * disk),
      band.from
    ),
  }));
  const low = paint(
    coverage(profile(INNER + 0.05) * 0.6 * disk) * lean * 0.7,
    INNER
  );
  const ring = paint(0.85, 0);
  // The beaming as a mask across the long axis: full strength on the side
  // turning towards the viewer, dimmer on the other.
  const brightest = beam(1, 1, sin);
  const beamStops = [-1, -0.5, 0, 0.5, 1].map((c) => (
    <stop
      key={c}
      offset={fixed((c + 1) / 2)}
      style={{
        stopColor: "#fff",
        stopOpacity: fixed(
          Math.max(0.25, beam(c, spin, sin) / brightest) ** 0.6
        ),
      }}
    />
  ));
  const width = `${(2 * EXTENT * size * 100).toFixed(1)}cqmin`;
  const halo = paint(coverage(0.12 * disk), SHADOW);
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
          <linearGradient
            id={`${id}-beam`}
            gradientUnits="userSpaceOnUse"
            x1="-1"
            x2="1"
            y1="0"
            y2="0"
          >
            {beamStops}
          </linearGradient>
          <mask
            id={`${id}-beaming`}
            maskUnits="userSpaceOnUse"
            x={-EXTENT}
            y={-EXTENT}
            width={2 * EXTENT}
            height={2 * EXTENT}
          >
            <rect
              x={-EXTENT}
              y={-EXTENT}
              width={2 * EXTENT}
              height={2 * EXTENT}
              fill={`url(#${id}-beam)`}
            />
          </mask>
          <radialGradient
            id={`${id}-halo`}
            gradientUnits="userSpaceOnUse"
            cx="0"
            cy="0"
            r="1"
          >
            {[SHADOW, 0.3, 0.34, 0.4, 0.5, 0.6].map((r) => (
              <stop
                key={r}
                offset={fixed(r)}
                style={{
                  stopColor: halo.color,
                  // Clear by the last stop, so nothing pads out past it.
                  stopOpacity: fixed(
                    r === 0.6 ? 0 : halo.opacity * Math.exp(-(r - SHADOW) * 14)
                  ),
                }}
              />
            ))}
          </radialGradient>
          <linearGradient
            id={`${id}-under`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            x2="0"
            y1="0"
            y2={LOW_OUTER}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((share) => (
              <stop
                key={share}
                offset={share}
                style={{
                  stopColor: low.color,
                  stopOpacity: fixed(low.opacity * Math.sqrt(share)),
                }}
              />
            ))}
          </linearGradient>
        </defs>
        <g transform={`rotate(${angle - 90})`}>
          {/* Behind the hole: the glow, the far half of the flat disk, the
              far side lensed over the top and the thin image under it. */}
          <g mask={`url(#${id}-beaming)`}>
            <circle r="1" fill={`url(#${id}-halo)`} />
            <g transform={`scale(1 ${fixed(squash)})`}>
              {bands.map((band) => (
                <path
                  key={`far-${band.from}`}
                  d={flatBand({ from: band.from, side: -1, to: band.to })}
                  style={{ fill: band.color }}
                  opacity={fixed(band.opacity)}
                />
              ))}
            </g>
            {lean > 0.01 &&
              bands.map((band) => (
                <path
                  key={`arc-${band.from}`}
                  d={arcBand({ from: band.from, lean, to: band.to })}
                  style={{ fill: band.color }}
                  opacity={fixed(band.opacity * lean)}
                />
              ))}
            {lean > 0.01 && <path d={LOW_BAND} fill={`url(#${id}-under)`} />}
          </g>
          {stars > 0 &&
            LENSED.map((star) => {
              const from = ((star.at - star.length / 2) * Math.PI) / 180;
              const to = ((star.at + star.length / 2) * Math.PI) / 180;
              return (
                <path
                  key={star.at}
                  d={`M${fixed(EINSTEIN * Math.cos(from))} ${fixed(EINSTEIN * Math.sin(from))}A${EINSTEIN} ${EINSTEIN} 0 0 1 ${fixed(EINSTEIN * Math.cos(to))} ${fixed(EINSTEIN * Math.sin(to))}`}
                  fill="none"
                  style={{ stroke: ink }}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  opacity="0.8"
                />
              );
            })}
          {/* The shadow hides everything behind it. */}
          <circle r={SHADOW} style={{ fill: paper }} />
          <g mask={`url(#${id}-beaming)`}>
            <circle
              r={RING}
              fill="none"
              style={{ stroke: ring.color }}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              opacity={fixed(ring.opacity)}
            />
            {/* The near half of the disk, in front of the shadow. */}
            <g transform={`scale(1 ${fixed(squash)})`}>
              {bands.map((band) => (
                <path
                  key={`near-${band.from}`}
                  d={flatBand({ from: band.from, side: 1, to: band.to })}
                  style={{ fill: band.color }}
                  opacity={fixed(band.opacity)}
                />
              ))}
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};

/**
 * A black hole: a dark shadow ringed by a thin, bright photon ring, inside
 * a hot accretion disk seen at a slant. The lens bends the far side of the
 * disk up over the top of the shadow and under the bottom, so the disk
 * wraps round the hole, while its near half crosses in front. The gas
 * streams round in turbulent bands, faster near the hole, and the side
 * turning towards the viewer is brighter. Stars behind it bend into arcs.
 * Decorative and full-bleed: size it with `className`, usually
 * `absolute inset-0`.
 */
export const BlackHole = ({
  tilt = 80,
  angle = 90,
  direction = "clockwise",
  center = CENTRE,
  size = 0.5,
  disk = 1,
  stars = 1,
  colorField = false,
  palette = DEFAULT_PALETTE,
  matrix = "blue-noise",
  stillTime = 6,
  style,
  ...props
}: BlackHoleProps) => {
  const leaning = clamp(tilt, 0, 88);
  const radians = (leaning * Math.PI) / 180;
  const turn = direction === "counterclockwise" ? -1 : 1;
  const radius = Math.max(0.05, size);
  const glow = clamp(disk, 0, 1.5);
  const starCount = clamp(stars, 0, 3);
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
        holeAngle: angle,
        holeCenter: center,
        holeCos: Math.max(0.06, Math.cos(radians)),
        holeDisk: glow,
        holeInks: palette.length - 2,
        holeLean: leanOf(Math.sin(radians)),
        holeSin: Math.sin(radians),
        holeSize: radius,
        holeSpin: turn,
        holeStars: starCount,
      }}
      fallback={
        <BlackHoleFallback
          palette={palette}
          center={center}
          size={radius}
          tilt={leaning}
          angle={angle}
          spin={turn}
          disk={glow}
          colorField={colorField}
          stars={starCount}
        />
      }
    />
  );
};
