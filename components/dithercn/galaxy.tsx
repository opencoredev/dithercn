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
  /** Radius of the galaxy, out to its arm tips, as a share of the box's shorter side. Default 0.48. */
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

/** Where the arm tips end, in disc radii. `size` reaches this far. */
const REACH = 1.2;

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
  // galaxySize reaches the arm tips.
  q *= ${REACH.toFixed(2)} / (galaxySize * min(aspect, 1.0));
  float a = radians(galaxyAngle);
  return vec2(dot(q, vec2(sin(a), cos(a))), dot(q, vec2(-cos(a), sin(a))));
}

// Distance from the centre of the bulge, which stays rounder than the disc.
float galaxyBulgeRadius(vec2 v) {
  return length(vec2(v.x, v.y / mix(1.0, galaxyCos, 0.4)));
}

// A background star. x is 1 on its cells, else 0; y is a random value for
// the star. At most one sits in each block of 16 by 16 cells, at a random
// spot, so they spread evenly instead of clumping. The brightest few are
// small crosses. Fixed to the screen. A star whose centre falls on the
// galaxy is hidden whole, so none shows as a broken cross at its edge.
vec2 galaxyStar(vec2 uv, vec2 res) {
  vec2 cell = floor(uv * res);
  vec2 block = floor(cell / 16.0);
  float seed = hash21(block * 1.37 + 0.71);
  vec2 spot = 2.0 + floor(vec2(hash21(block + 13.1), hash21(block.yx + 7.3)) * 12.0);
  vec2 d = abs(cell - block * 16.0 - spot);
  vec2 at = galaxyView((block * 16.0 + spot + 0.5) / res, res);
  float behind = max(
    step(length(vec2(at.x, at.y / galaxyCos)), 1.3),
    step(galaxyBulgeRadius(at), 0.75)
  );
  float chance = 0.14 * galaxyStars;
  float on = step(1.0 - chance, seed) * (1.0 - behind);
  float bright = step(1.0 - chance * 0.2, seed);
  return vec2(on * step(d.x + d.y, bright), hash21(block + 29.3));
}

mat2 galaxyTurn(float a) {
  return mat2(cos(a), sin(a), -sin(a), cos(a));
}

// How far the disc leans over, 0 face-on to about 0.83 at 80 degrees, and
// how much of that shows as an edge-on lane, 0 to 1.
float galaxyEdgeOn() {
  return smoothstep(0.5, 0.85, 1.0 - galaxyCos);
}

// Light into tone, with one curve for the bulge and a steeper one for the
// disc. The bulge's light adds up past 1, so its soft exposure rolls off
// instead of clipping: only the very centre reaches solid ink, and the
// glow around it steps down smoothly through the dither's tones. The
// disc's curve has a toe, so the faint light between the arms stays
// paper and the gaps read dark.
float galaxyExpose(float light) {
  return 1.0 - exp(-1.7 * light);
}

float galaxyExposeDisc(float light) {
  return pow(1.0 - exp(-1.6 * light), 1.7);
}

// The light at view point v, already dimmed by the dust in front of it:
// x from the disc and its arms, y from the bulge. cell is the size of one
// dot, in disc radii.
vec2 galaxyLight(vec2 v, float t, float cell) {
  // Into the plane of the disc. Mirroring x flips the spiral and the spin.
  vec2 g = vec2(v.x * galaxySpin, v.y / galaxyCos);
  float r = length(g);
  float theta = atan(g.y, g.x);

  // The whole pattern turns as one rigid piece, so it never winds up or
  // shears. m is the point in the turning frame, where the texture is fixed.
  float turn = 0.07 * t;
  vec2 m = galaxyTurn(turn) * g;

  // The arms: logarithmic spirals, bent by a slow smooth warp so they
  // don't trace perfect curves. The warp eases off towards the rim, so an
  // arm runs steadily outwards to its tip instead of dipping back inside
  // the reach and leaving a loose blob past its point.
  float warp = snoise(m * 1.1 + vec2(3.7, 1.9)) * (1.0 - 0.8 * smoothstep(0.55, 1.05, r));
  float wind = galaxyTwist * 1.7;
  float psi = galaxyArms * (theta + turn - wind * log(r + 0.05)) + warp * 0.6;
  // Phase from the nearest crest, positive on the inner flank. Crests are
  // 2 pi apart, so an arm and its gap share that span.
  float d = mod(psi + 3.14159265, 6.28318531) - 3.14159265;
  // How fast the phase changes across the arm, per disc radius, so a
  // width in phase can be turned into a width on screen.
  float across = galaxyArms * sqrt(1.0 / (r * r + 0.0025) + wind * wind / ((r + 0.05) * (r + 0.05)));
  // Each arm is a smooth ramp, steeper on the inner flank, that narrows
  // outwards and ends in a rounded point at the reach, so it never breaks
  // up into loose dots. Narrow shoulders leave dark gaps between the arms.
  float tip = clamp((r - 0.72) / 0.42, 0.0, 1.0);
  float width = mix(1.05, 0.78, smoothstep(-0.4, 0.4, d)) / (1.0 + 0.9 * smoothstep(0.3, 1.0, r));
  width *= sqrt(1.0 - tip * tip) + 0.001;
  // Seen nearly edge-on, every line of sight crosses several arms, so they
  // blur into a smooth lens.
  float blur = 0.85 * galaxyEdgeOn();
  // A dense crest inside a soft halo that thins out to single dots. It
  // narrows with the arm, so it never reaches across the gap to the next.
  float body = exp(-d * d / (width * width)) + 0.16 * exp(-d * d / (2.6 * width * width));
  float arm = mix(body, 0.65 * exp(-r * 1.6), blur);
  // The dust lane runs along the inner flank, partway down the shoulder,
  // with a thin ridge of light inside it, so it reads as a dark thread
  // through the arm. Its width is held near two dots on screen, so it
  // stays crisp near the core and doesn't smear out towards the tips.
  float laneAt = 0.5 * width + 0.08;
  // A flat dark core with soft edges, so it stays an unbroken line.
  float laneWidth = clamp(1.4 * cell * across, 0.1, 0.4 * width + 0.06);
  float lane = 1.0 - smoothstep(0.55, 1.25, abs(d - laneAt) / laneWidth);
  float ridgeAt = laneAt + 1.6 * laneWidth;
  float ridge = exp(-(d - ridgeAt) * (d - ridgeAt) / (0.6 * laneWidth * laneWidth)) * (1.0 - blur);

  // Slow swells of light along the arms, and knots of young stars: small
  // round patches on the crests. Both turn with the arms, and both calm
  // down towards the tips.
  float clump = snoise(m * 2.3 + vec2(1.3, 8.1)) * (1.0 - 0.7 * tip);
  float knot = smoothstep(0.35, 0.75, snoise(m * 6.0 + vec2(5.1, 2.3))) * (1.0 - tip);

  // The arms grow out of the bulge's glow rather than cutting across it.
  // It goes dark just before the arm narrows past a few dots, so the tip
  // ends in a clean point instead of a thin trail of single dots.
  float reach = smoothstep(0.08, 0.32, r) * (1.0 - smoothstep(1.08, 1.17, r));
  // Never near solid, so the core outshines them: dimmest inside the
  // bulge's glow, which adds to them there, brightest through the middle
  // of the disc and a little dimmer towards the tips. Nearly edge-on the
  // arms blur into one lens, which needs more light to stay dense.
  float crest = (0.8 + 0.32 * smoothstep(0.25, 0.6, r) - 0.25 * smoothstep(0.75, 1.1, r))
    * (0.86 + 0.14 * clump) * (1.0 + 0.9 * galaxyEdgeOn());
  float light = (arm + 0.25 * ridge * exp(-d * d / (4.0 * width * width))) * crest * reach
    + 0.12 * exp(-r * 5.0) * (1.0 - smoothstep(0.5, 0.9, r))
    + 0.35 * knot * arm * arm * reach;

  // The bulge: a small solid centre on a wide shoulder that steps down
  // through many tones into the inner disc, past the first turn of the
  // arms. The shoulder, not a bigger centre, is what makes it glow.
  float rb = galaxyBulgeRadius(v);
  float bulge = (2.6 * exp(-rb * rb * 100.0) + 1.9 * exp(-rb * 7.5)) * (1.0 - smoothstep(0.35, 0.65, rb));

  // Dust lanes along the arms, from the edge of the bulge out past the
  // last bright stretch, and a dusty ring whose near half, seen at a
  // slant, lies in front of the bulge and the far side of the disc. The
  // ring only shows past about 50 degrees.
  // (smoothstep needs ascending edges, so the near half is 1 minus it.)
  float lanes = lane * (1.0 - blur) * smoothstep(0.08, 0.18, r) * (1.0 - smoothstep(0.88, 1.06, r)) * (1.0 - tip * tip);
  float near = (1.0 - smoothstep(-0.04, 0.0, g.y)) * smoothstep(0.35, 0.8, 1.0 - galaxyCos);
  float ring = smoothstep(0.1, 0.28, r) * (1.0 - smoothstep(0.6, 0.95, r));
  float veil = clamp((lanes * 1.15 + near * ring * 0.8) * galaxyDust * (0.92 + 0.08 * clump), 0.0, 0.96);

  // Edge-on, the broad veil gives way to the thin lane across the core, so
  // the bulge still glows below it.
  // A disc seen at a slant is brighter, since each line of sight crosses
  // more of it. Held back until it nears edge-on, so it doesn't wash out
  // the arms at moderate tilts.
  // The bulge is a ball, not a disc, so it doesn't gain as much, but it
  // gains enough to keep outshining the arms that cross in front of it.
  light *= 1.0 + 1.2 * galaxyEdgeOn();
  bulge *= 1.0 + 0.8 * galaxyEdgeOn();
  return vec2(light * (1.0 - veil), bulge * (1.0 - veil * (1.0 - galaxyEdgeOn()) * 0.92));
}

// The size of one dot, in disc radii.
float galaxyCell(vec2 res) {
  return ${REACH.toFixed(2)} / (galaxySize * min(res.x, res.y));
}
`;

const FIELD = `${GEOMETRY}
float field(vec2 uv, vec2 res, float t) {
  vec2 v = galaxyView(uv, res);
  float cellSize = galaxyCell(res);
  vec2 light = galaxyLight(v, t, cellSize);

  // Nearly edge-on, the dense inner ring on the near side reads as one
  // crisp dark lane across the core, as in the Sombrero galaxy, with bulge
  // light on both sides of it. It fades in from about 60 degrees. Its width
  // is set on screen, at least a few dots, so it stays crisp however flat
  // the disc or small the box.
  float across = abs(v.x);
  float laneY = -galaxyCos * sqrt(max(0.0324 - across * across, 0.0));
  float laneD = abs(v.y - laneY) / max(0.022 + 0.07 * galaxyCos, 1.75 * cellSize);
  float midplane = 1.0 - smoothstep(0.55, 1.0, laneD);
  midplane *= 1.0 - smoothstep(0.34, 0.7, across);
  float band = clamp(galaxyEdgeOn() * midplane * galaxyDust * 1.2, 0.0, 0.97);

  // The disc and the bulge each take their own curve, then add like light
  // through a screen, so neither clips the other.
  float disc = galaxyExposeDisc(light.x * (1.0 - band));
  float core = galaxyExpose(light.y * (1.0 - band));
  float glow = 1.0 - (1.0 - disc) * (1.0 - core);

  return max(glow, galaxyStar(uv, res).x);
}
`;

const COLOR_FIELD = `${GEOMETRY}
// The 4 by 4 Bayer threshold of a cell, in [0, 1).
float galaxyBayer2(vec2 a) {
  a = floor(a);
  return fract(a.x * 0.5 + a.y * a.y * 0.75);
}

float galaxyBayer(vec2 cell) {
  return galaxyBayer2(cell * 0.5) * 0.25 + galaxyBayer2(cell);
}

vec3 colorField(vec2 uv, vec2 res, float t) {
  vec2 v = galaxyView(uv, res);
  vec2 light = galaxyLight(v, t, galaxyCell(res));
  // The last palette colour where the bulge outshines the disc, so its glow
  // fades out in that colour, and the first ink colour on the arms, even
  // where they cross the core. Each dot takes one palette colour, picked
  // by an ordered threshold, so the narrow seam between them is an even
  // pattern, not noise or a muddy blend.
  // The floor keeps the bulge's faint tail from tinting the dark outskirts.
  float share = light.y / (light.x + light.y + 0.05);
  // The handover is narrow, a short ordered ramp at the bulge's edge, so
  // it reads as the core's own glow rather than a checkerboard. A palette
  // with a middle colour steps through it on the way.
  float x = smoothstep(0.38, 0.62, share) * galaxyInks;
  float pick = floor(x) + step(galaxyBayer(floor(uv * res)) + 0.03125, fract(x));
  // Each background star takes one palette colour, whole.
  vec2 star = galaxyStar(uv, res);
  float far = smoothstep(0.5, 0.9, galaxyBulgeRadius(v));
  pick = mix(pick, floor(star.y * (galaxyInks + 0.999)), star.x * far);
  return paletteColor(pick / max(galaxyInks, 1.0)).rgb;
}
`;

const DEFAULT_PALETTE: DitherPalette = ["--dither-paper", "--dither-ink"];

const CENTRE: GalaxyPoint = [0.5, 0.5];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** A prop as given, or its default when it isn't a finite number. */
const finite = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback;

/** The defaults of the numeric props. */
const DEFAULTS = {
  angle: 70,
  arms: 2,
  dust: 0.8,
  size: 0.48,
  stars: 1,
  stillTime: 8,
  tilt: 55,
  twist: 1,
} as const;

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
const ARM_OUTER = REACH;

/** The shader's soft exposure for the bulge: light in, tone out. */
const expose = (light: number) => 1 - Math.exp(-1.7 * light);

/** The shader's steeper curve for the disc, which keeps faint light paper. */
const exposeDisc = (light: number) => (1 - Math.exp(-1.6 * light)) ** 1.7;

/**
 * Soft arms as stacked ribbons, widest and faintest first. `width` is the
 * half-width in the shader's arm phase (its crest is half as bright about
 * 0.75 away, and its faint halo reaches about 1.4), `alpha` the share of
 * the arm's brightness each ribbon adds, and `level` how bright the arm is
 * at the ribbon's edge, which picks its colour from a palette of three or
 * more.
 */
const ARM_LAYERS = [
  { alpha: 0.22, level: 0.3, width: 1.4 },
  { alpha: 0.45, level: 0.65, width: 0.95 },
  { alpha: 0.85, level: 1, width: 0.55 },
] as const;

/** Radii where the fallback's gradients sample the shader's profiles. */
const PROFILE_STOPS = [
  0, 0.04, 0.08, 0.12, 0.17, 0.22, 0.28, 0.34, 0.42, 0.5, 0.6, 0.7, 0.8, 0.9, 1,
  1.1, 1.2, 1.3,
];

/**
 * Brightness of an arm's crest at radius `r`, as in `field`: growing out
 * of the bulge, dim inside its glow, brightest through the middle of the
 * disc and dimming a little towards the tip, where the arm ends by
 * narrowing. Never as bright as the core.
 */
const armTone = (r: number) =>
  exposeDisc(
    0.93 *
      (0.8 + 0.32 * smooth(0.25, 0.6, r) - 0.25 * smooth(0.75, 1.1, r)) *
      smooth(0.08, 0.32, r) *
      (1 - smooth(1.08, 1.17, r))
  );

/** The faint light of the disc between the arms. */
const discTone = (r: number) =>
  exposeDisc(0.12 * Math.exp(-r * 5) * (1 - smooth(0.5, 0.9, r)));

/**
 * Brightness of the bulge at bulge radius `r`, as in `field`: a solid
 * centre that glows out softly into the inner disc.
 */
const bulgeTone = (r: number) =>
  expose(
    (2.6 * Math.exp(-r * r * 100) + 1.9 * Math.exp(-r * 7.5)) *
      (1 - smooth(0.35, 0.65, r))
  );

/** Strength of the dust lane along an arm at radius `r`. */
const laneTone = (r: number) => {
  const tip = clamp((r - 0.72) / 0.42, 0, 1);
  return smooth(0.08, 0.18, r) * (1 - smooth(0.88, 1.06, r)) * (1 - tip * tip);
};

/** Strength of the dusty ring at radius `r`. */
const ringTone = (r: number) =>
  smooth(0.1, 0.28, r) * (1 - smooth(0.6, 0.95, r));

/**
 * The outline of one arm: the shader's logarithmic spiral, widened by
 * `width` radians either side of its crest and narrowing to a rounded
 * point at the tip. Drawn
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
      const tip = clamp((r - 0.72) / 0.42, 0, 1);
      const taper = Math.sqrt(1 - tip * tip) / (1 + 0.9 * smooth(0.3, 1, r));
      const theta =
        twist * 1.7 * Math.log(r + 0.05) + phase + sign * width * taper;
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
      const warmth = (1 - smooth(0.06, 0.4, r)) * (inks.length - 1);
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
  const lanes = 0.95 * dust * (1 - 0.85 * edgeOn);
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
  const width = `${((2 * EXTENT * size * 100) / REACH).toFixed(1)}cqmin`;
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
          <filter
            id={`${id}-fine`}
            x="-1.5"
            y="-1.5"
            width="3"
            height="3"
            filterUnits="userSpaceOnUse"
          >
            <feGaussianBlur stdDeviation="0.006" />
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
            </g>
            {/* The lanes get a finer blur than the arms, so they stay thin
                dark threads instead of melting into them. */}
            <g filter={`url(#${id}-fine)`}>
              {lanes > 0 &&
                phases.map((phase) => (
                  <path
                    key={`lane-${phase}`}
                    d={armPath({
                      phase: phase + 0.55 / arms,
                      spin,
                      twist,
                      width: 0.16 / arms,
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
 * A spiral galaxy turning slowly: a solid, glowing core, broad logarithmic
 * arms with knots of stars and dust lanes along their inner edges, a soft
 * glow between them and evenly spaced fixed stars behind, seen as a tilted
 * disc. The pattern turns as one piece, so the spiral never winds up.
 * Decorative and full-bleed: size it with `className`, usually
 * `absolute inset-0`.
 */
export const Galaxy = ({
  arms = DEFAULTS.arms,
  twist = DEFAULTS.twist,
  tilt = DEFAULTS.tilt,
  angle = DEFAULTS.angle,
  direction = "clockwise",
  center = CENTRE,
  size = DEFAULTS.size,
  dust = DEFAULTS.dust,
  stars = DEFAULTS.stars,
  colorField = false,
  palette = DEFAULT_PALETTE,
  stillTime = DEFAULTS.stillTime,
  style,
  ...props
}: GalaxyProps) => {
  // NaN or Infinity from a slider or a parsed string would slip through the
  // clamps and blank the shader, so each falls back to its default first.
  const armCount = Math.round(clamp(finite(arms, DEFAULTS.arms), 2, 5));
  const leaning = clamp(finite(tilt, DEFAULTS.tilt), 0, 80);
  const turned = finite(angle, DEFAULTS.angle);
  const spin = direction === "counterclockwise" ? -1 : 1;
  const winding = clamp(finite(twist, DEFAULTS.twist), 0.3, 2);
  const disc = Math.max(0.05, finite(size, DEFAULTS.size));
  const dustiness = clamp(finite(dust, DEFAULTS.dust), 0, 1);
  const starCount = clamp(finite(stars, DEFAULTS.stars), 0, 3);
  const still = finite(stillTime, DEFAULTS.stillTime);
  const middle: GalaxyPoint = [
    finite(center[0], CENTRE[0]),
    finite(center[1], CENTRE[1]),
  ];
  return (
    <DitherShader
      {...props}
      field={FIELD}
      colorField={colorField ? COLOR_FIELD : undefined}
      palette={palette}
      stillTime={still}
      style={{ containerType: "size", ...style }}
      uniforms={{
        galaxyAngle: turned,
        galaxyArms: armCount,
        galaxyCenter: middle,
        galaxyCos: Math.max(0.17, Math.cos((leaning * Math.PI) / 180)),
        galaxyDust: dustiness,
        galaxyInks: palette.length - 2,
        galaxySize: disc,
        galaxySpin: spin,
        galaxyStars: starCount,
        galaxyTwist: winding,
      }}
      fallback={
        <GalaxyFallback
          palette={palette}
          center={middle}
          size={disc}
          tilt={leaning}
          angle={turned}
          arms={armCount}
          twist={winding}
          spin={spin}
          turn={0.07 * still}
          dust={dustiness}
          colorField={colorField}
          stars={starCount}
        />
      }
    />
  );
};
