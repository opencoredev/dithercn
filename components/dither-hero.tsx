"use client";

import { DitherShader, ditherMask } from "@/lib/dither";
import { cn } from "@/lib/utils";

/**
 * Site illustration, not a registry piece: a slow aurora over a planet's
 * horizon, ordered-dithered with the same 4x4 Bayer matrix as <BayerRamp />.
 *
 * Drawn by <DitherShader /> from dither-core. The static CSS rings below
 * are its fallback: they paint first and stay for anyone without WebGL.
 */

// Shared geometry: an ellipse whose top edge is the horizon. Centre and radii
// are fractions of the card's width and height, measured from the top.
const PLANET = { cx: 0.5, cy: 1.3, rx: 0.76, ry: 0.42 } as const;

// Static composition: rings around the planet's edge, as fractions of its
// radius, each filled at one Bayer level. Densest at the rim.
const RINGS = [
  { from: 0.95, level: 4, to: 0.98 },
  { from: 0.98, level: 10, to: 1 },
  { from: 1, level: 14, to: 1.04 },
  { from: 1.04, level: 9, to: 1.1 },
  { from: 1.1, level: 5, to: 1.18 },
  { from: 1.18, level: 2, to: 1.28 },
] as const;

const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

const ringStyle = ({
  from,
  level,
  to,
}: (typeof RINGS)[number]): React.CSSProperties => {
  const ring = `radial-gradient(ellipse ${pct(PLANET.rx)} ${pct(PLANET.ry)} at ${pct(PLANET.cx)} ${pct(PLANET.cy)}, transparent ${pct(from)}, #000 ${pct(from)}, #000 ${pct(to)}, transparent ${pct(to)})`;
  const images = `${ditherMask(level / 16)}, ${ring}`;
  const sizes = "calc(var(--dither-cell) * 4), 100% 100%";
  return {
    WebkitMaskComposite: "source-in",
    WebkitMaskImage: images,
    WebkitMaskRepeat: "repeat, no-repeat",
    WebkitMaskSize: sizes,
    maskComposite: "intersect",
    maskImage: images,
    maskRepeat: "repeat, no-repeat",
    maskSize: sizes,
  };
};

// The field: tone in [0, 1] for one dither cell. Its helpers are prefixed
// `hero` so they never collide with dither-core's own `fbm`.
const FIELD = `
const vec2 PLANET_CENTRE = vec2(${PLANET.cx.toFixed(3)}, ${(1 - PLANET.cy).toFixed(3)});
const vec2 PLANET_RADIUS = vec2(${PLANET.rx.toFixed(3)}, ${PLANET.ry.toFixed(3)});

float heroNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float heroFbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * heroNoise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    amp *= 0.5;
  }
  return sum / 0.875;
}

float field(vec2 p, vec2 res, float t) {
  vec2 cell = p * res;
  float aspect = res.x / res.y;
  vec2 world = vec2(p.x * aspect, p.y);

  // Domain-warped noise, drifting slowly sideways along the horizon.
  vec2 warp = vec2(
    heroFbm(world * 1.3 + vec2(t * 0.021, 0.0)),
    heroFbm(world * 1.3 + vec2(5.2, 1.3) - vec2(0.0, t * 0.017))
  );
  float n = heroFbm(world * vec2(1.1, 2.6) + 1.7 * warp + vec2(t * 0.013, 0.0));

  // Signed distance from the horizon, in planet radii.
  float e = length((p - PLANET_CENTRE) / PLANET_RADIUS) - 1.0;
  float above = max(e, 0.0);
  float below = max(-e, 0.0);

  // Aurora curtains: noise stretched vertically, sliding along the horizon.
  // It thins out fast, so the upper half stays clear for the headline.
  float curtains = heroFbm(vec2(world.x * 5.0 + 2.0 * warp.x - t * 0.03, above * 1.5 - t * 0.01));
  float lit = 0.35 + 0.9 * n * curtains + 0.25 * n;
  float glow = exp(-above * 10.0) * lit + 0.22 * exp(-above * 5.5) * curtains * curtains;
  // A lit rim just inside the edge, then the dark planet.
  float rim = exp(-below * 34.0) * (0.85 + 0.4 * n);
  float tone = e > 0.0 ? glow : rim;

  // A few fixed stars in the dark sky, kept off the headline column. They
  // never move or blink.
  vec2 starCell = floor(cell);
  float starSeed = hash21(vec2(hash21(starCell), hash21(starCell.yx + 31.7)) * 97.0);
  float star = step(0.9988, starSeed) * step(0.3, above) * step(0.22, abs(p.x - 0.5));
  return max(tone, star);
}
`;

// Reduced motion shows this moment of the animation, held still.
const STILL_TIME = 14;

const Fallback = () =>
  RINGS.map((ring) => (
    <div
      key={ring.from}
      className="bg-dither-ink absolute inset-0"
      style={ringStyle(ring)}
    />
  ));

export const DitherHero = ({ className }: { className?: string }) => (
  <DitherShader
    field={FIELD}
    matrix="bayer4"
    levels={17}
    stillTime={STILL_TIME}
    fallback={<Fallback />}
    className={cn("dither-hero absolute inset-0", className)}
  />
);
