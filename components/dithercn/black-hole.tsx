"use client";

import { useId, useRef } from "react";
import type { Ref } from "react";

import { cssColor, DitherShader, useDitherColors } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps, Rgba } from "@/lib/dither";

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
  /** Radius of the accretion disk as a share of the box's shorter side. The shadow's radius is 0.3 of it. Default 0.5. */
  size?: number;
  /** Brightness of the accretion disk, 0 (only the shadow, the photon ring and the stars) to 1.5. Default 1. */
  disk?: number;
  /** How many background stars, 0 to 3. Default 1. */
  stars?: number;
  /**
   * Colour the dots by temperature instead of brightness: the last palette
   * colour on the photon ring and the hot inner disk, fading through the
   * palette to the first ink colour at the cool rim, with a palette colour
   * for each star. Give it three or more colours, such as
   * `["--dither-paper", "red", "orange", "--dither-ink"]`. The shadow
   * stays paper on any theme. Default `false`.
   */
  colorField?: boolean;
};

/** Radius of the shadow, in disk radii. */
const SHADOW = 0.3;
/**
 * The inner edge of the disk, where it is hottest. The lensed images of the
 * disk start here too, so a thin dark gap of the same width runs between
 * the photon ring and the disk all the way round.
 */
const INNER = 0.345;
/**
 * How thick the lensed far side is over the top of the shadow, as a share
 * of the flat disk's width. Towards the horizon it widens back to the flat
 * disk, so the arc flows into the disk on both sides.
 */
const ARC_THICK = 0.42;
/** How thick the thin image of the underside is, under the shadow. */
const LOW_THICK = 0.09;
/**
 * Half the thickness of the disk itself, in disk radii. Seen at a slant,
 * it softens the inner edge of the near half into a shaded band.
 */
const SLAB = 0.06;
/** How many heights through the slab each cell samples. */
const SLAB_SAMPLES = 12;
/** How sharply the gas thins away from the slab's middle plane. */
const SLAB_FALLOFF = 2.2;
/** The heights the slab samples, from its top face (1) to its underside (-1). */
const SLAB_HEIGHTS = Array.from(
  { length: SLAB_SAMPLES },
  (_, index) => 1 - (2 * (index + 0.5)) / SLAB_SAMPLES
);
/**
 * How much brighter the slab glows than a single sheet of its gas: seen
 * nearly edge-on, each cell looks through a long path of it.
 */
const SLAB_GLOW = 1.6;
/** The sum of the samples' weights, so the slab's light keeps its scale. */
const SLAB_WEIGHT = SLAB_HEIGHTS.reduce(
  (sum, s) => sum + Math.exp(-SLAB_FALLOFF * s * s),
  0
);
/**
 * How opaque the gas of the near half is, per unit of the disk's profile:
 * dense gas by the inner edge hides the photon ring, the thin gas towards
 * the rim lets a trace of it through.
 */
const OPACITY = 3.5;
/** Width of one orbiting lane of gas, in disk radii. */
const LANE = 0.11;
/** Angular speed of the gas at the inner edge, in radians per second. */
const OMEGA = 1.2;
/** Radius of the Einstein ring that bends the stars behind. */
const EINSTEIN = 0.5;
/** The disk's light turns into tone as 1 - exp(-GAIN * light). */
const GAIN = 1.7;
/** How far above the horizon the flat far half still shows next to the arc. */
const HORIZON = 0.06;

const glsl = (value: number) => value.toFixed(4);

/**
 * Geometry shared by both shader functions. The engine keeps one copy of a
 * definition that appears word for word in `field` and `colorField`.
 */
const GEOMETRY = `
const float holeShadow = ${glsl(SHADOW)};
const float holeInner = ${glsl(INNER)};
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

// A step in the turned view back on the screen's axes, still in disk radii.
vec2 holeScreen(vec2 d) {
  float a = radians(holeAngle);
  return d.x * vec2(sin(a), cos(a)) + d.y * vec2(-cos(a), sin(a));
}

// Brightness of the disk at radius r in its own plane: a crisp inner edge,
// hottest right at it, falling smoothly to nothing at the rim.
float holeProfile(float r) {
  float inner = smoothstep(holeInner - 0.003, holeInner + 0.02, r);
  float outer = 1.0 - smoothstep(0.55, 1.0, r);
  return inner * outer * pow(holeInner / max(r, holeInner), 1.3);
}

// Doppler beaming. c is the cosine of the angle round the disk from its
// right-hand end: the side turning towards the viewer is brighter, and the
// more edge-on the disk, the stronger the effect.
float holeBeam(float c) {
  float b = 1.0 + 0.32 * holeSpin * c * holeSin;
  return b * b * b;
}

// Each image of the disk as (disk radius, angle round the disk, how many
// screen units one disk radius spans across it, which image: 1 the flat
// disk, 2 the far side lensed over the shadow, 3 the thin image under it).
// The lens is faked in polar coordinates round the centre instead of
// tracing rays. Above the horizon the far side is packed into an arc over
// the shadow, its inner edge at the same radius all the way round; at the
// horizon it widens back into the flat disk.
vec4 holeFlat(vec2 g) {
  float r = length(g);
  // Across the disk, the screen spans cos(tilt) of it in front and all of it
  // at the sides.
  float c = g.x / max(r, 1e-4);
  float span = sqrt(c * c + (1.0 - c * c) * holeCos * holeCos);
  return vec4(r, atan(g.y, g.x), span, 1.0);
}

// The flat disk at the middle of its thickness.
vec4 holeNear(vec2 v) {
  return holeFlat(vec2(v.x, v.y / holeCos));
}

vec4 holeArc(vec2 v, float rho) {
  float thick = mix(1.0, ${glsl(ARC_THICK)}, holeLean);
  return vec4(holeInner + (rho - holeInner) / thick, atan(v.y, v.x), thick, 2.0);
}

// The far side: the arc, or the thin flat far half above the horizon,
// whichever shows hotter gas, so the arc flows into the flat disk at the
// sides.
vec4 holeFar(vec2 v, float rho) {
  vec4 arc = holeArc(v, rho);
  vec4 plain = holeNear(v);
  return arc.x < plain.x ? arc : plain;
}

vec4 holeLow(vec2 v, float rho) {
  float r = holeInner + (rho - holeInner) / ${glsl(LOW_THICK)};
  return vec4(r, atan(v.y, v.x), ${glsl(LOW_THICK)}, 3.0);
}

// A star behind the hole, as (brightness, a random number for its colour).
// The cell is traced back through a point lens to find which star it could
// show, and that star's image is then traced forward again, so each star is
// one square dot, or a small cross for the brightest, wherever the lens
// puts it: never a streak. The sky drifts very slowly sideways, so stars
// passing behind swing round the hole.
vec2 holeStar(vec2 v, float cell, float t) {
  float e2 = holeEinstein * holeEinstein;
  vec2 source = v * (1.0 - e2 / max(dot(v, v), 1e-4));
  vec2 drift = vec2(t * 0.25 * holeSpin, 0.0);
  vec2 id = floor((source / cell + drift) / 12.0);
  if (hash21(id + 3.1) > 0.16 * holeStars) {
    return vec2(0.0);
  }
  // Away from the edges of its square, so the lens never cuts a star off.
  vec2 at = floor(3.0 + 6.0 * vec2(hash21(id + 7.1), hash21(id + 13.7))) + 0.5;
  vec2 s = (id * 12.0 + at - drift) * cell;
  float sl = max(length(s), 1e-4);
  vec2 image = s * (0.5 + 0.5 * sqrt(1.0 + 4.0 * e2 / (sl * sl)));
  vec2 d = abs(holeScreen(v - image)) / cell;
  float big = step(0.85, hash21(id + 5.3));
  float shape = max(step(d.x, 0.5) * step(d.y, 0.5 + big), step(d.y, 0.5) * step(d.x, 0.5 + big));
  float bright = max(big, ceil(hash21(id + 9.7) * holeInks) / holeInks);
  return vec2(bright * shape, hash21(id + 11.9));
}

// On a light page the shadow and the gap round the photon ring are drawn in
// the last ink, so the hole stays a dark void: 1 inside, 0 outside.
float holeHollow(float rho, float cell) {
  return holeVoid * (1.0 - smoothstep(holeInner, holeInner + cell, rho));
}
`;

const FIELD = `${GEOMETRY}
// Angular speed of the gas at radius r: Keplerian, so the inner disk turns
// several times faster than the rim.
float holeOmega(float r) {
  return ${glsl(OMEGA)} * pow(holeInner / max(r, holeInner), 1.5);
}

// One lane of gas, k lanes out from the inner edge: brighter and darker
// streaks round a circle that turns rigidly at the lane's own speed.
// Sampling the noise on a circle keeps it seamless. Mostly fine streaks,
// so no single clump is big enough to swell the disk as it passes.
float holeLane(float k, float a, float t) {
  float b = a + holeSpin * holeOmega(holeInner + (k + 0.5) * ${glsl(LANE)}) * t;
  vec2 around = vec2(cos(b), sin(b));
  vec2 seed = vec2(k * 4.7, k * 1.9);
  float n = 0.35 * snoise(around * 1.8 + seed) + 0.65 * snoise(around * 4.5 + seed.yx + 17.0);
  return clamp(1.3 * n, -1.0, 1.0);
}

// Streaks that orbit the hole, in [-1, 1]. The disk is split into lanes,
// each turning at its own speed and blended softly into the next, so the
// inner disk runs ahead of the outer without the pattern ever winding up
// into noise. Where a lane spans under a few cells on screen, as in the
// thin band in front of the shadow, the streaks fade to the steady disk
// instead of breaking into speckle.
float holeStreaks(vec4 image, float cell, float t) {
  float s = max(image.x - holeInner, 0.0) / ${glsl(LANE)};
  float k = floor(s);
  float n = mix(holeLane(k, image.y, t), holeLane(k + 1.0, image.y, t), smoothstep(0.15, 0.85, fract(s)));
  float clear = smoothstep(1.2, 3.5, ${glsl(LANE)} * image.z / cell);
  return n * clear;
}

// The light of one image of the disk at this cell. The streaks ride inside
// a steady envelope: strongest by the inner edge and gone towards the rim,
// so the outline of the disk holds still while the gas turns inside it.
float holeLight(vec4 image, float cell, float t) {
  float heat = holeProfile(image.x);
  if (heat <= 0.0) {
    return 0.0;
  }
  float depth = 0.42 * (1.0 - smoothstep(0.42, 0.75, image.x));
  return heat * holeBeam(cos(image.y)) * (1.0 + depth * holeStreaks(image, cell, t));
}

// The flat disk as a slab of glowing gas with some thickness, thicker
// towards the rim. Seen at a slant, a cell looks through the slab along a
// short line, front to back, from its top face to its underside. The line
// is sampled at several heights, densest at the middle plane; each sample
// lands on the disk at its own radius, so the near half's inner edge keeps
// its bow and both its edges shade off softly instead of stopping at a
// line. Samples on the near side of the hole add their glow and dim what
// lies behind, as gas does; samples on the far side add up to the flat far
// half. Returns the near half's light, the far half's light, and how much
// of what lies behind the near half shows through it. At the sides, past
// the hole, the two halves share out the samples, so no seam runs along
// the horizon.
vec3 holeSlab(vec2 v, float cell, float t) {
  float r0 = max(length(vec2(v.x, v.y / holeCos)), holeInner);
  float height = ${glsl(SLAB)} * (0.2 + r0);
  float nearLight = 0.0;
  float farLight = 0.0;
  float through = 1.0;
  for (int i = 0; i < ${SLAB_SAMPLES}; i++) {
    // From the top face, in front, down to the underside behind.
    float s = 1.0 - 2.0 * (float(i) + 0.5) / ${glsl(SLAB_SAMPLES)};
    float w = exp(-${glsl(SLAB_FALLOFF)} * s * s);
    vec4 image = holeFlat(vec2(v.x, (v.y - s * height * holeSin) / holeCos));
    float glow = w * holeLight(image, cell, t);
    if (sin(image.y) < 0.0) {
      nearLight += glow;
      through *= exp(-${glsl(OPACITY)} * holeDisk * w * holeProfile(image.x) / ${glsl(SLAB_WEIGHT)});
    } else {
      farLight += glow;
    }
  }
  float scale = ${glsl(SLAB_GLOW)} / ${glsl(SLAB_WEIGHT)};
  return vec3(nearLight * scale, farLight * scale, through);
}

float field(vec2 uv, vec2 res, float t) {
  vec2 v = holeView(uv, res);
  float rho = length(v);
  // One cell in disk radii, so the photon ring keeps a crisp width.
  float cell = 1.0 / (holeSize * min(res.x, res.y));
  float outside = smoothstep(holeShadow - 0.5 * cell, holeShadow + 0.5 * cell, rho);

  // Behind the hole: the far side lensed into an arc over the top, carrying
  // on a little below the horizon beside the shadow so no notch opens
  // between the ring and the near half, and the thin image of the underside
  // below, which fades out towards the horizon. Both stop at the shadow.
  float notch = (1.0 - smoothstep(0.0, 0.05, -v.y)) * (1.0 - smoothstep(holeInner, holeInner + 0.08, rho));
  float above = max(smoothstep(-0.5 * cell, 0.5 * cell, v.y), notch);
  float arc = above * holeLight(holeArc(vec2(v.x, abs(v.y)), rho), cell, t);
  float under = smoothstep(0.0, 0.55, -v.y / max(rho, 1e-4)) * holeLean;
  float low = 0.75 * under * holeLight(holeLow(v, rho), cell, t);

  // The flat disk. Its far half only adds to the light out at the sides,
  // beyond the arc, and along the horizon, where it meets the near half,
  // so the dark gap round the ring stays clean. The near half glows in
  // front of everything, the shadow included, and dims the images behind
  // it as its gas thickens.
  vec3 slab = holeSlab(v, cell, t);
  float horizon = (1.0 - smoothstep(0.0, ${glsl(HORIZON)}, v.y)) * smoothstep(holeInner, holeInner + 0.03, abs(v.x));
  float sides = max(smoothstep(holeInner + 0.05, holeInner + 0.3, rho), horizon);
  float light = slab.x + max(slab.z * max(arc, low), sides * slab.y) * outside;
  float tone = 1.0 - exp(-${glsl(GAIN)} * holeDisk * light);

  // The photon ring: one thin, solid circle on the edge of the shadow. It
  // fades behind the near half as the gas there thickens.
  float ring = 1.0 - smoothstep(0.52, 0.8, abs(rho - holeShadow - 0.5 * cell) / cell);
  tone = max(tone, ring * slab.z);

  // Stars show only on clear sky.
  float hollow = holeHollow(rho, cell);
  vec2 star = holeStar(v, cell, t);
  float sky = outside * (1.0 - hollow) * (1.0 - smoothstep(0.02, 0.12, tone));
  // On a light page the brightest gas stops at holeCap, one ink short of
  // the last, and the void takes that last ink: gas in front of it
  // lightens it towards holeCap. Between the void and the gas there is no
  // ink in between, so there the tone is lifted to keep the band from
  // breaking into a checker of the two.
  float lifted = 1.0 - pow(1.0 - tone, 3.0);
  float onPaper = mix(holeCap * tone, 1.0 - (1.0 - holeCap) * lifted, hollow);
  tone = mix(tone, onPaper, holeVoid);
  return max(tone, star.x * sky);
}
`;

const COLOR_FIELD = `${GEOMETRY}
vec3 colorField(vec2 uv, vec2 res, float t) {
  vec2 v = holeView(uv, res);
  float rho = length(v);
  float cell = 1.0 / (holeSize * min(res.x, res.y));
  // The disk radius this cell shows: the near half in front, its soft
  // edges included, else the image behind.
  vec4 near = holeNear(v);
  bool front = holeProfile(near.x) > 0.02 || (near.x > holeInner && near.x < 1.1);
  vec4 image = v.y >= 0.0 ? holeFar(v, rho) : (front ? near : holeLow(v, rho));
  // Hottest at the inner edge, on the photon ring, and on the side turning
  // towards the viewer.
  float heat = (1.0 - smoothstep(holeInner, 0.95, image.x)) * clamp(0.6 + 0.3 * holeBeam(cos(image.y)), 0.0, 1.0);
  float ring = 1.0 - smoothstep(0.5, 2.0, abs(rho - holeShadow - 0.6 * cell) / cell);
  heat = max(heat, ring);
  // Stars, away from the light of the disk, each take one colour of their own.
  vec2 star = holeStar(v, cell, t);
  float starry = step(0.01, star.x) * (1.0 - step(0.01, holeProfile(image.x) * holeDisk)) * step(holeShadow + 3.0 * cell, rho);
  return paletteColor(mix(heat, star.y, starry)).rgb;
}
`;

const DEFAULT_PALETTE: DitherPalette = ["--dither-paper", "--dither-ink"];

const CENTRE: BlackHolePoint = [0.5, 0.5];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** `value` where it is a finite number, else `fallback`, as for NaN or Infinity. */
const finite = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback;

/** GLSL's smoothstep, for the fallback's profiles. */
const smooth = (lo: number, hi: number, x: number) => {
  const t = clamp((x - lo) / (hi - lo), 0, 1);
  return t * t * (3 - 2 * t);
};

const fixed = (value: number) => value.toFixed(4);

/** Brightness of the disk at radius `r`, as in `holeProfile`. */
const profile = (r: number) =>
  smooth(INNER - 0.003, INNER + 0.02, r) *
  (1 - smooth(0.55, 1, r)) *
  (INNER / Math.max(r, INNER)) ** 1.3;

/** Doppler beaming at cosine `c` round the disk, as in `holeBeam`. */
const beam = (c: number, spin: number, sin: number) =>
  (1 + 0.32 * spin * c * sin) ** 3;

/** How far the lens bends the far side up, from the tilt. */
const leanOf = (sin: number) => smooth(0.25, 0.9, sin);

/** The disk's light turned into tone, as in `field`. */
const coverage = (light: number) => 1 - Math.exp(-GAIN * light);

/** One sRGB channel in [0, 1] as linear light. */
const linear = (channel: number) =>
  channel <= 0.040_45 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

/** Relative luminance of a resolved sRGB colour. */
const luminance = ([r, g, b]: Rgba) =>
  0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

/**
 * Whether the hole is drawn as a dark void: when the paper is lighter than
 * the last ink, as on a light page, and there is another ink left for the
 * gas. With one ink the shadow stays paper, ringed in ink.
 */
const isHollow = (colors: readonly Rgba[] | null) => {
  const paper = colors?.[0];
  const last = colors?.at(-1);
  if (!colors || colors.length < 3 || !paper || !last) {
    return false;
  }
  return luminance(paper) > luminance(last) + 0.05;
};

/** Radius of the void the fallback draws on a light page, round the photon ring. */
const VOID = INNER + 0.008;

/** Half the side of the fallback's square, in disk radii. */
const EXTENT = 1.1;

/** Disk radii the fallback's gradients sample, from the inner edge out. */
const SAMPLES = Array.from({ length: 25 }, (_, index) => {
  const r = INNER + 0.003 + ((1 - INNER - 0.003) * index) / 24;
  // A seeded wobble, like the shader's lanes of gas frozen in place.
  const s = Math.sin(index * 127.1 + 311.7) * 43_758.5453;
  return { r, streak: 0.9 + 0.2 * (s - Math.floor(s)) };
});

/**
 * A ring of the disk from the inner edge to radius `outer`, as a path with
 * y down the screen: `half` -1 is the top half, 1 the bottom half.
 */
const halfRing = ({ outer, half }: { outer: number; half: 1 | -1 }) => {
  const sweep = half === 1 ? 1 : 0;
  const back = half === 1 ? 0 : 1;
  return `M${fixed(outer)} 0A${fixed(outer)} ${fixed(outer)} 0 0 ${sweep} ${fixed(-outer)} 0L${fixed(-INNER)} 0A${INNER} ${INNER} 0 0 ${back} ${INNER} 0Z`;
};

/** The whole flat disk, from the inner edge to the rim, as one ring. */
const FULL_RING = `M1 0A1 1 0 1 0 -1 0A1 1 0 1 0 1 0ZM${INNER} 0A${INNER} ${INNER} 0 1 1 ${-INNER} 0A${INNER} ${INNER} 0 1 1 ${INNER} 0Z`;

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
    bright: jitter(3) > 0.8,
    pick: jitter(4),
    x: (0.5 + n * 0.754_877_666_2 + 0.06 * (jitter(1) - 0.5)) % 1,
    y: (0.5 + n * 0.569_840_291 + 0.06 * (jitter(2) - 0.5)) % 1,
  };
});

/** Background stars per unit of `stars`. */
const STARS_PER_UNIT = 28;

/**
 * A static SVG stand-in shown without WebGL: the shadow, the photon ring,
 * the near half of the disk in front, the far side lensed into an arc over
 * the top and a thin image under the bottom, brighter on the side turning
 * towards the viewer, with a fixed scatter of stars, in the same colours.
 * Each image is one radial gradient that follows the shader's profile, so
 * the disk shades smoothly, and the near half is blurred across its
 * thickness as the shader's slab is.
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
  hollow,
  ref,
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
  hollow: boolean;
  /** The fallback's root, inside the shader's box, where colours resolve. */
  ref: Ref<HTMLDivElement>;
}) => {
  const id = useId().replaceAll(/[^\w-]/g, "");
  const paper = cssColor(palette[0]);
  const inks = palette.slice(1).map(cssColor);
  const ink = inks.at(-1) ?? paper;
  // On a light page the last ink is kept for the void, so the gas runs
  // through the others.
  const ramp = hollow ? inks.slice(0, -1) : inks;
  const between = (low: number, share: number) =>
    `color-mix(in oklab, ${ramp[low] ?? ink}, ${ramp[low + 1] ?? ramp[low] ?? ink} ${(share * 100).toFixed(0)}%)`;
  // The colour a tone paints at disk radius `r`. By default the tone runs
  // through the inks from first to last, each blended into the next, as
  // the dither mixes them. With colorField the colour follows the heat
  // instead, and the tone only sets how many dots there are.
  const paint = (tone: number, r: number) => {
    const level = clamp(tone, 0, 1);
    if (colorField) {
      const heat = (1 - smooth(INNER, 0.95, r)) * (ramp.length - 1);
      const low = Math.min(Math.floor(heat), Math.max(ramp.length - 2, 0));
      return { color: between(low, heat - low), opacity: level };
    }
    const scaled = level * ramp.length;
    if (scaled <= 1) {
      return { color: ramp[0] ?? ink, opacity: scaled };
    }
    const low = Math.min(Math.floor(scaled) - 1, Math.max(ramp.length - 2, 0));
    return { color: between(low, scaled - 1 - low), opacity: 1 };
  };
  const radians = (tilt * Math.PI) / 180;
  const squash = Math.max(0.06, Math.cos(radians));
  const sin = Math.sin(radians);
  const lean = leanOf(sin);
  // The spread of the shader's heights through the slab on screen, at the
  // middle of the disk.
  const blur = (SLAB * (0.2 + 0.5) * sin) / Math.sqrt(2 * SLAB_FALLOFF);
  const arcThick = 1 + (ARC_THICK - 1) * lean;
  // The colour and opacity a stop takes for the tone of the gas at radius
  // `r`: on paper, the gas's inks; over the void, the void lightened
  // towards the hottest gas ink, as the shader lifts it.
  const onPaper = (tone: number, r: number) => paint(tone, r);
  const overVoid = (tone: number) => ({
    color: ramp.at(-1) ?? ink,
    opacity: 1 - (1 - clamp(tone, 0, 1)) ** 3,
  });
  // How much of what lies behind the near half its gas hides, as black for
  // a mask, as the shader's slab dims the photon ring.
  const hides = (_tone: number, r: number) => ({
    color: "#000",
    opacity: 1 - Math.exp(-OPACITY * disk * profile(r)),
  });
  // One gradient per image: `thick` packs the disk from the inner edge out
  // into that share of its width, as `holeArc` and `holeLow` do.
  const gradient = ({
    name,
    thick,
    strength,
    stop = onPaper,
  }: {
    name: string;
    thick: number;
    /**
     * The light the gas paints with, so a brighter side takes the hotter
     * inks, as the beaming does in the shader.
     */
    strength: number;
    stop?: (tone: number, r: number) => { color: string; opacity: number };
  }) => {
    const outer = INNER + (1 - INNER) * thick;
    return (
      <radialGradient
        key={name}
        id={`${id}-${name}`}
        gradientUnits="userSpaceOnUse"
        cx="0"
        cy="0"
        r={fixed(outer)}
      >
        <stop
          offset={fixed((INNER - 0.002) / outer)}
          style={{ stopColor: paper, stopOpacity: 0 }}
        />
        {SAMPLES.map(({ r, streak }) => {
          const { color, opacity } = stop(
            coverage(profile(r) * streak * strength * disk),
            r
          );
          return (
            <stop
              key={r}
              offset={fixed((INNER + (r - INNER) * thick) / outer)}
              style={{ stopColor: color, stopOpacity: fixed(opacity) }}
            />
          );
        })}
      </radialGradient>
    );
  };
  const ring = paint(1, 0);
  // The beaming: the disk is painted twice, with the light of its dim side
  // and of its bright side, and the bright copy fades in across the long
  // axis towards the side turning towards the viewer.
  const sides = [
    { key: "dim", light: beam(-1, 1, sin), mask: undefined },
    {
      key: "bright",
      light: beam(1, 1, sin),
      mask: `url(#${id}-beaming)`,
    },
  ] as const;
  const width = `${(2 * EXTENT * size * 100).toFixed(1)}cqmin`;
  const square = {
    height: 2 * EXTENT,
    width: 2 * EXTENT,
    x: -EXTENT,
    y: -EXTENT,
  };
  // A strip just above the horizon on either side of the inner edge, where
  // the flat far half meets the near half.
  const beside = (fill: string) =>
    ([-1, 1] as const).map((side) => (
      <rect
        key={side}
        x={side === 1 ? INNER + 0.015 : -EXTENT}
        y={-HORIZON}
        width={EXTENT - INNER - 0.015}
        height={HORIZON}
        fill={fill}
      />
    ));
  return (
    <div
      ref={ref}
      className="absolute inset-0"
      style={{ backgroundColor: paper }}
    >
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
            {[0, 0.25, 0.5, 0.75, 1].map((share) => (
              <stop
                key={share}
                offset={share}
                style={{
                  stopColor: "#fff",
                  stopOpacity: fixed(
                    smooth(0, 1, spin === 1 ? share : 1 - share)
                  ),
                }}
              />
            ))}
          </linearGradient>
          <mask id={`${id}-beaming`} maskUnits="userSpaceOnUse" {...square}>
            <rect {...square} fill={`url(#${id}-beam)`} />
          </mask>
          {/* The flat far half shows only out at the sides, beyond the arc. */}
          <radialGradient
            id={`${id}-sides-fade`}
            gradientUnits="userSpaceOnUse"
            cx="0"
            cy="0"
            r="1"
          >
            {[INNER + 0.05, INNER + 0.175, INNER + 0.3].map((r, index) => (
              <stop
                key={r}
                offset={fixed(r)}
                style={{ stopColor: "#fff", stopOpacity: index / 2 }}
              />
            ))}
          </radialGradient>
          {/* Behind the hole the flat disk shows only its far half, and
              that only out at the sides; the near half is drawn in front. */}
          <mask id={`${id}-sides`} maskUnits="userSpaceOnUse" {...square}>
            <rect
              x={-EXTENT}
              y={-EXTENT}
              width={2 * EXTENT}
              height={EXTENT}
              fill={`url(#${id}-sides-fade)`}
            />
            {beside(`url(#${id}-horizon)`)}
          </mask>
          {/* The disk's thickness, seen at a slant, softens the flat disk
              across its width, so the halves also meet softly at the
              horizon. */}
          <filter
            id={`${id}-slab`}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
            {...square}
          >
            <feGaussianBlur stdDeviation={`0 ${fixed(blur)}`} />
          </filter>
          {/* Near the horizon the arc gives way to the flat disk, as the
              brighter image wins in the shader. */}
          <mask id={`${id}-arc`} maskUnits="userSpaceOnUse" {...square}>
            <rect {...square} fill="#fff" />
            {beside(`url(#${id}-horizon-out)`)}
          </mask>
          <linearGradient
            id={`${id}-horizon`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            x2="0"
            y1={-HORIZON}
            y2="0"
          >
            {[0, 0.5, 1].map((share) => (
              <stop
                key={share}
                offset={share}
                style={{ stopColor: "#fff", stopOpacity: smooth(0, 1, share) }}
              />
            ))}
          </linearGradient>
          <linearGradient id={`${id}-horizon-out`} href={`#${id}-horizon`}>
            {[0, 0.5, 1].map((share) => (
              <stop
                key={share}
                offset={share}
                style={{ stopColor: "#000", stopOpacity: smooth(0, 1, share) }}
              />
            ))}
          </linearGradient>
          {/* The image under the shadow fades out towards the horizon. */}
          <linearGradient
            id={`${id}-under-fade`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            x2="0"
            y1="0"
            y2={INNER}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((share) => (
              <stop
                key={share}
                offset={share}
                style={{
                  stopColor: "#fff",
                  stopOpacity: fixed(lean * smooth(0, 0.55, share)),
                }}
              />
            ))}
          </linearGradient>
          <mask id={`${id}-under`} maskUnits="userSpaceOnUse" {...square}>
            <rect {...square} fill={`url(#${id}-under-fade)`} />
          </mask>
          {sides.map(({ key, light }) => [
            gradient({ name: `arc-${key}`, strength: light, thick: arcThick }),
            gradient({
              name: `flat-${key}`,
              strength: SLAB_GLOW * light,
              thick: 1,
            }),
            hollow &&
              gradient({
                name: `void-${key}`,
                stop: overVoid,
                strength: SLAB_GLOW * light,
                thick: 1,
              }),
            gradient({
              name: `low-${key}`,
              strength: 0.75 * light,
              thick: LOW_THICK,
            }),
          ])}
          {gradient({ name: "hides", stop: hides, strength: 1, thick: 1 })}
          {/* The photon ring fades behind the near half as its gas
              thickens, and shows in full with no disk. */}
          <mask id={`${id}-ring`} maskUnits="userSpaceOnUse" {...square}>
            <rect {...square} fill="#fff" />
            <g filter={`url(#${id}-slab)`}>
              <path
                d={halfRing({ half: 1, outer: 1 })}
                fill={`url(#${id}-hides)`}
                transform={`scale(1 ${fixed(squash)})`}
              />
            </g>
          </mask>
          <clipPath id={`${id}-void`}>
            <circle r={VOID} />
          </clipPath>
          {hollow && (
            <mask id={`${id}-paper`} maskUnits="userSpaceOnUse" {...square}>
              <rect {...square} fill="#fff" />
              <circle r={VOID} fill="#000" />
            </mask>
          )}
        </defs>
        <g transform={`rotate(${angle - 90})`}>
          {sides.map(({ key, mask }) => (
            <g key={key} mask={mask}>
              {/* Behind the hole: the far side lensed over the top, the flat
                  far half at the sides, and the thin image under the
                  shadow. */}
              <path
                d={halfRing({
                  half: -1,
                  outer: INNER + (1 - INNER) * arcThick,
                })}
                fill={`url(#${id}-arc-${key})`}
                mask={`url(#${id}-arc)`}
              />
              <g filter={`url(#${id}-slab)`}>
                <g mask={`url(#${id}-sides)`}>
                  <path
                    d={FULL_RING}
                    fillRule="evenodd"
                    fill={`url(#${id}-flat-${key})`}
                    transform={`scale(1 ${fixed(squash)})`}
                  />
                </g>
              </g>
              <path
                d={halfRing({
                  half: 1,
                  outer: INNER + (1 - INNER) * LOW_THICK,
                })}
                fill={`url(#${id}-low-${key})`}
                mask={`url(#${id}-under)`}
              />
            </g>
          ))}
          {/* The shadow hides everything behind it, ringed by the photon
              ring. On a light page the void takes the last ink and spans
              the gap round the ring too. */}
          {hollow ? (
            <circle r={VOID} style={{ fill: ink }} />
          ) : (
            <circle r={SHADOW} style={{ fill: paper }} />
          )}
          <circle
            r={SHADOW}
            fill="none"
            mask={`url(#${id}-ring)`}
            style={{ stroke: ring.color }}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {/* In front of everything: the near half of the disk, softened
              across its thickness. On a light page the part over the void
              lightens it instead of darkening the paper. */}
          {(hollow ? (["flat", "void"] as const) : (["flat"] as const)).map(
            (layer) => (
              <g
                key={layer}
                mask={
                  hollow && layer === "flat" ? `url(#${id}-paper)` : undefined
                }
                clipPath={layer === "void" ? `url(#${id}-void)` : undefined}
              >
                <g filter={`url(#${id}-slab)`}>
                  {sides.map(({ key, mask }) => (
                    <g key={key} mask={mask}>
                      <path
                        d={halfRing({ half: 1, outer: 1 })}
                        fill={`url(#${id}-${layer}-${key})`}
                        transform={`scale(1 ${fixed(squash)})`}
                      />
                    </g>
                  ))}
                </g>
              </g>
            )
          )}
        </g>
      </svg>
    </div>
  );
};

/**
 * A black hole: a dark shadow ringed by a thin, solid photon ring, inside a
 * hot accretion disk seen at a slant. The lens bends the far side of the
 * disk up over the top of the shadow and, as a thinner image, under the
 * bottom, while the near half crosses in front as a softly shaded band.
 * Lanes of gas orbit the hole, the inner ones several times faster than the
 * rim, and the side turning towards the viewer is brighter. Stars behind it
 * swing round the hole as the sky drifts. On a light page, given two or
 * more inks, the shadow and the gap round the ring take the last ink, so
 * the hole stays a dark void. Decorative and full-bleed: size it with
 * `className`, usually `absolute inset-0`.
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
  matrix = "bayer4",
  stillTime = 6,
  style,
  ...props
}: BlackHoleProps) => {
  const leaning = clamp(finite(tilt, 80), 0, 88);
  const radians = (leaning * Math.PI) / 180;
  const turn = direction === "counterclockwise" ? -1 : 1;
  const radius = Math.max(0.05, finite(size, 0.5));
  const glow = clamp(finite(disk, 1), 0, 1.5);
  const starCount = clamp(finite(stars, 1), 0, 3);
  const heading = finite(angle, 90);
  const middle: BlackHolePoint = [
    finite(center[0], CENTRE[0]),
    finite(center[1], CENTRE[1]),
  ];
  // The fallback is always mounted inside the shader's box, so the palette
  // resolves there, with any theme scoped round the component.
  const probe = useRef<HTMLDivElement>(null);
  // Dots coloured by heat take one colour each, so they cannot mix the gas
  // into a dark void; with colorField the shadow stays paper.
  const resolved = useDitherColors(probe, palette);
  const hollow = !colorField && isHollow(resolved);
  const inks = Math.max(1, palette.length - 1);
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
        holeAngle: heading,
        // On a light page the gas stops one ink short of the last, which
        // the void keeps.
        holeCap: hollow ? (inks - 1) / inks : 1,
        holeCenter: middle,
        holeCos: Math.max(0.06, Math.cos(radians)),
        holeDisk: glow,
        holeInks: inks,
        holeLean: leanOf(Math.sin(radians)),
        holeSin: Math.sin(radians),
        holeSize: radius,
        holeSpin: turn,
        holeStars: starCount,
        holeVoid: hollow ? 1 : 0,
      }}
      fallback={
        <BlackHoleFallback
          palette={palette}
          center={middle}
          size={radius}
          tilt={leaning}
          angle={heading}
          spin={turn}
          disk={glow}
          colorField={colorField}
          stars={starCount}
          hollow={hollow}
          ref={probe}
        />
      }
    />
  );
};
