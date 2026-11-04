"use client";

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

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

const mixed = (color: string, share: number) =>
  `color-mix(in oklab, ${color} ${share}%, transparent)`;

/**
 * A CSS stand-in shown without WebGL: a tilted glow for the disc, faint
 * spokes for the arms and a few tiled stars, in the same colours.
 */
const GalaxyFallback = ({
  palette,
  center,
  size,
  tilt,
  angle,
  arms,
  colorField,
  stars,
}: {
  palette: DitherPalette;
  center: GalaxyPoint;
  size: number;
  tilt: number;
  angle: number;
  arms: number;
  colorField: boolean;
  stars: number;
}) => {
  const paper = cssColor(palette[0]);
  const ink = cssColor(palette.at(-1) ?? palette[1]);
  const arm = colorField ? cssColor(palette[1]) : ink;
  const squash = Math.max(0.17, Math.cos((tilt * Math.PI) / 180));
  const width = `${(size * 200).toFixed(1)}cqmin`;
  const disc = {
    height: `calc(${width} * ${squash.toFixed(3)})`,
    left: percent(center[0]),
    top: percent(center[1]),
    transform: `translate(-50%, -50%) rotate(${angle - 90}deg)`,
    width,
  };
  const slice = 100 / arms;
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: paper,
        backgroundImage:
          stars <= 0
            ? undefined
            : [
                [ink, 17, 23],
                [arm, 61, 131],
                [ink, 139, 71],
                [arm, 101, 13],
              ]
                .map(
                  ([color, x, y]) =>
                    `radial-gradient(circle at ${x}px ${y}px, ${color} 1px, transparent 1.5px)`
                )
                .join(", "),
        backgroundSize: "157px 149px",
      }}
    >
      <div
        className="absolute"
        style={{
          ...disc,
          backgroundImage: `repeating-conic-gradient(from ${angle}deg, ${mixed(arm, 28)} 0%, transparent ${(slice * 0.5).toFixed(2)}%, ${mixed(arm, 28)} ${slice.toFixed(2)}%)`,
          maskImage:
            "radial-gradient(closest-side, transparent 12%, #000 30%, transparent 92%)",
        }}
      />
      <div
        className="absolute"
        style={{
          ...disc,
          backgroundImage: `radial-gradient(closest-side, ${ink} 0%, ${mixed(ink, 80)} 7%, ${mixed(arm, 40)} 22%, ${mixed(arm, 14)} 55%, transparent 100%)`,
        }}
      />
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
        galaxyDust: clamp(dust, 0, 1),
        galaxyInks: palette.length - 2,
        galaxySize: Math.max(0.05, size),
        galaxySpin: direction === "counterclockwise" ? -1 : 1,
        galaxyStars: clamp(stars, 0, 3),
        galaxyTwist: clamp(twist, 0.3, 2),
      }}
      fallback={
        <GalaxyFallback
          palette={palette}
          center={center}
          size={size}
          tilt={leaning}
          angle={angle}
          arms={armCount}
          colorField={colorField}
          stars={stars}
        />
      }
    />
  );
};
