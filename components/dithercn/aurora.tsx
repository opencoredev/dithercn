"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type {
  DitherColor,
  DitherPalette,
  DitherShaderProps,
} from "@/lib/dither";

/** Where the aurora fades to paper so text on top stays clean. */
export type AuroraMask = "none" | "top" | "bottom" | "edges";

/** `up`: rays rise from a bright lower edge. `down`: they hang from the top. */
export type AuroraDirection = "up" | "down";

export type AuroraProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** The bright lower edge of each curtain. Default `"--dither-ink"`. */
  color?: DitherColor;
  /** The faint tops of the rays, for a two-tone sky. Default: `color`. */
  tipColor?: DitherColor;
  /** The sky behind. Default `"--dither-paper"`. */
  background?: DitherColor;
  /** Number of curtains, 1 to 6. Default 3. */
  curtains?: number;
  /** Where the lowest bright edge hangs, 0 (bottom) to 1 (top). Default 0.42. */
  height?: number;
  /** Vertical gap between curtains, 0 to 0.3. Default 0.11. */
  spread?: number;
  /** How far the edges fold, 0 (straight) to 3. Default 1. */
  sway?: number;
  /** Fine ripples along the edges, 0 to 2. Default 0.6. */
  turbulence?: number;
  /** How many rays fit across, 2 (broad bands) to 20 (fine needles). Default 8. */
  rays?: number;
  /** How far the rays reach up, 0 (short) to 1 (long). Default 0.45. */
  length?: number;
  /** Brightness of the edge line, 0 to 2. Default 0.9. */
  glow?: number;
  /** Brightness of the curtains, 0 to 1. Default 0.95. */
  intensity?: number;
  /** Slow brightness ripple, 0 to 1. Default 0.2. */
  shimmer?: number;
  /** Horizontal zoom: higher values fit more folds across. Default 1. */
  scale?: number;
  /** Tilt of the curtains in degrees, -45 to 45. Default 0. */
  tilt?: number;
  /** Sideways travel, -2 (left) to 2 (right). Default 0. */
  drift?: number;
  /** Which way the rays point. Default `"up"`. */
  direction?: AuroraDirection;
  /** Fade it out where text sits. Default `"none"`. */
  mask?: AuroraMask;
};

const MASKS = {
  bottom: 2,
  edges: 3,
  none: 0,
  top: 1,
} as const satisfies Record<AuroraMask, number>;

const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  if (auroraFlip > 0.5) {
    p.y = -p.y;
  }
  float c = cos(auroraTilt);
  float s = sin(auroraTilt);
  p = vec2(c * p.x + s * p.y, -s * p.x + c * p.y) + vec2(0.0, 0.5);
  float x = p.x * auroraScale + t * auroraDrift * 0.04;
  float decayBase = mix(15.0, 2.2, auroraLength);
  float light = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi >= auroraCurtains) {
      break;
    }
    float depth = fi / max(auroraCurtains - 1.0, 1.0);
    float edge = auroraHeight + fi * auroraSpread
      + auroraSway * 0.11 * snoise(vec2(x * 0.55 + fi * 3.1, t * 0.035 + fi * 1.7))
      + auroraTurbulence * 0.05 * snoise(vec2(x * 2.1 - fi * 1.3, t * 0.07 + fi));
    float above = p.y - edge;
    float curtain = above > 0.0
      ? exp(-above * decayBase * (1.0 + fi * 0.4))
      : exp(above * 48.0);
    float bend = snoise(vec2(x * 0.8, t * 0.03 + fi)) * (0.25 + 0.35 * auroraSway);
    float rx = (x + bend) * auroraRays;
    float rays = mix(0.2, 1.0, smoothstep(0.25, 0.75, fbm(vec2(rx + fi * 9.0, t * 0.045 + fi))));
    rays *= 0.75 + 0.25 * snoise(vec2(rx * 3.2, fi * 4.0 + t * 0.02));
    float patch = mix(0.3, 1.0, smoothstep(0.25, 0.7, fbm(vec2(x * 0.45 + fi * 5.0, t * 0.02 + fi * 2.0))));
    float rim = exp(-abs(above) * 34.0) * auroraGlow;
    float haze = above > 0.0 ? exp(-above * 5.0) * 0.09 : exp(above * 14.0) * 0.05;
    light += (curtain * rays + rim * (0.5 + 0.5 * rays) + haze) * patch * mix(1.0, 0.5, depth);
  }
  float ripple = 0.5 + 0.5 * sin(t * 0.8 + p.x * 4.0 + 2.0 * snoise(vec2(p.x * 2.5, t * 0.15)));
  float tone = (1.0 - exp(-light * 1.25)) * auroraIntensity * (1.0 - auroraShimmer * 0.45 * ripple);

  float keep = 1.0;
  if (auroraMask > 2.5) {
    keep = smoothstep(0.0, 0.22, uv.x) * smoothstep(1.0, 0.78, uv.x);
  } else if (auroraMask > 1.5) {
    keep = smoothstep(0.02, 0.4, uv.y);
  } else if (auroraMask > 0.5) {
    keep = smoothstep(0.98, 0.6, uv.y);
  }
  return tone * keep;
}
`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** `color` mixed into `base` at `share` percent. */
const mix = (color: DitherColor, share: number, base: DitherColor) =>
  `color-mix(in oklch, ${cssColor(color)} ${share}%, ${cssColor(base)})`;

/** Paper, two tints of the tip colour, the edge colour, then its brightest. */
const auroraPalette = ({
  color,
  tipColor = color,
  background,
}: {
  color: DitherColor;
  tipColor?: DitherColor;
  background: DitherColor;
}): DitherPalette => [
  background,
  mix(tipColor, 30, background),
  mix(tipColor, 70, background),
  color,
  mix(color, 50, "--foreground"),
];

const DIRECTIONS = {
  down: { flip: 1, gradient: "to bottom" },
  up: { flip: 0, gradient: "to top" },
} as const satisfies Record<
  AuroraDirection,
  { flip: number; gradient: string }
>;

/** A CSS glow along the lowest edge, shown without WebGL. */
const AuroraFallback = ({
  palette,
  height,
  direction,
}: {
  palette: DitherPalette;
  height: number;
  direction: AuroraDirection;
}) => {
  const ink = cssColor(palette.at(-2) ?? palette[1]);
  const edge = `${(clamp(height, 0, 1) * 100).toFixed(1)}%`;
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: cssColor(palette[0]),
        backgroundImage: `linear-gradient(${DIRECTIONS[direction].gradient}, transparent ${edge}, color-mix(in oklch, ${ink} 45%, transparent) calc(${edge} + 4%), transparent 85%)`,
      }}
    />
  );
};

/**
 * Slow curtains of light that sway and shimmer, drawn as a dither.
 * Decorative and full-bleed: size it with `className`, usually
 * `absolute inset-0`. Set `color`, `tipColor` and `background` for a
 * quick palette, or pass `palette` (paper to brightest) to take over.
 */
export const Aurora = ({
  color = "--dither-ink",
  tipColor,
  background = "--dither-paper",
  curtains = 3,
  height = 0.42,
  spread = 0.11,
  sway = 1,
  turbulence = 0.6,
  rays = 8,
  length = 0.45,
  glow = 0.9,
  intensity = 0.95,
  shimmer = 0.2,
  scale = 1,
  tilt = 0,
  drift = 0,
  direction = "up",
  mask = "none",
  palette,
  matrix = "bayer8",
  ...props
}: AuroraProps) => {
  const colors = palette ?? auroraPalette({ background, color, tipColor });

  return (
    <DitherShader
      {...props}
      field={FIELD}
      palette={colors}
      matrix={matrix}
      uniforms={{
        auroraCurtains: clamp(Math.round(curtains), 1, 6),
        auroraDrift: clamp(drift, -2, 2),
        auroraFlip: DIRECTIONS[direction].flip,
        auroraGlow: clamp(glow, 0, 2),
        auroraHeight: height,
        auroraIntensity: clamp(intensity, 0, 1),
        auroraLength: clamp(length, 0, 1),
        auroraMask: MASKS[mask],
        auroraRays: clamp(rays, 1, 32),
        auroraScale: Math.max(0.1, scale),
        auroraShimmer: clamp(shimmer, 0, 1),
        auroraSpread: clamp(spread, 0, 0.5),
        auroraSway: Math.max(0, sway),
        auroraTilt: (clamp(tilt, -45, 45) * Math.PI) / 180,
        auroraTurbulence: Math.max(0, turbulence),
      }}
      fallback={
        <AuroraFallback
          palette={colors}
          height={height}
          direction={direction}
        />
      }
    />
  );
};
