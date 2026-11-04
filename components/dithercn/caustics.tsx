"use client";

import { cssColor, DitherShader } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

/** Where the light fades out so text on top stays clean. */
export type CausticsMask = "none" | "center" | "top" | "bottom";

export type CausticsProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback"
> & {
  /** How many cells of light fit in the height of the box. Default 4. */
  scale?: number;
  /** How tightly the light is focused, 0 to 1: soft wide bands at 0, thin bright filaments at 1. Default 0.7. */
  focus?: number;
  /** Direction the net drifts, in degrees as in CSS: 90 moves it right, 180 down. Default 160. */
  angle?: number;
  /** The brightest tone, 0 to 1. Lower it to sit text on top. Default 1. */
  intensity?: number;
  /** Fade the light out where text sits, leaving dim water. Default `"none"`. */
  mask?: CausticsMask;
};

const MASKS = {
  bottom: 3,
  center: 1,
  none: 0,
  top: 2,
} as const satisfies Record<CausticsMask, number>;

const CAUSTICS_PALETTE = [
  "--dither-paper",
  "color-mix(in oklch, var(--dither-ink) 22%, var(--dither-paper))",
  "color-mix(in oklch, var(--dither-ink) 55%, var(--dither-paper))",
  "--dither-ink",
] as const satisfies DitherPalette;

const FIELD = `
vec2 causticsHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

// One net of light. Each lattice square holds a seed that circles slowly;
// light gathers along the borders between neighbouring seeds. Returns the
// distance to the nearest border (x) and how close the cell is to a point
// where three borders meet (y, 1 at the junction).
vec2 causticsNet(vec2 p, float t) {
  vec2 g = floor(p);
  vec2 f = fract(p);
  vec2 r1 = vec2(8.0);
  vec2 r2 = vec2(8.0);
  float d1 = 64.0;
  float d2 = 64.0;
  float d3 = 64.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 h = causticsHash(g + o);
      vec2 r = o + 0.5 + 0.38 * sin(t * (0.22 + 0.2 * h.yx) + 6.2831853 * h) - f;
      float d = dot(r, r);
      if (d < d1) {
        d3 = d2; d2 = d1; r2 = r1; d1 = d; r1 = r;
      } else if (d < d2) {
        d3 = d2; d2 = d; r2 = r;
      } else if (d < d3) {
        d3 = d;
      }
    }
  }
  // Distance to the bisector of the two nearest seeds: the same width
  // along the whole border, unlike the gap between the two distances.
  float edge = dot(0.5 * (r1 + r2), normalize(r2 - r1));
  float junction = exp(-(sqrt(d3) - sqrt(d1)) * 9.0);
  return vec2(edge, junction);
}

// The light a net throws: a crisp core about causticsWidth cells wide,
// thicker and hotter where borders meet, dimmer along long runs, pinched
// thin in places by pinch, and a narrow glow that the sunlight brightens.
float causticsLight(vec2 net, float perCell, float glow, float sun, float pinch) {
  float d = net.x / perCell;
  float w = causticsWidth * (0.75 + 0.9 * net.y * net.y) * pinch;
  float core = 1.0 - smoothstep(w * 0.5 - 0.5, w * 0.5 + 0.5, d);
  float halo = exp(-net.x * glow);
  return core * mix(0.7, 1.0, max(net.y, sun * 0.6)) + (halo * 0.26 + net.y * net.y * 0.14) * sun;
}

float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * causticsScale;
  vec2 flow = causticsFlow * t * 0.05;
  // One pattern unit is res.y / scale cells.
  float perCell = causticsScale / res.y;

  // A slow swell bends the borders into curves, as a real surface would.
  vec2 bend = vec2(
    snoise(p * 0.55 + vec2(t * 0.06, 1.7)),
    snoise(p * 0.55 + vec2(4.3, -t * 0.05))
  );
  // Smaller, quicker ripples on top make each border wobble along its length.
  vec2 ripple = vec2(
    snoise(p * 1.5 + vec2(-t * 0.09, 8.2)),
    snoise(p * 1.5 + vec2(2.6, t * 0.08))
  );
  vec2 q = p + flow + bend * 0.32 + ripple * 0.08;
  // Sunlight comes through in broad patches, never evenly.
  float sun = 0.5 + 0.5 * snoise(p * 0.18 + flow * 0.4 + vec2(t * 0.012, 2.1));
  float glow = mix(5.0, 18.0, causticsFocus);
  // The surface focuses some stretches of each filament harder than others.
  float pinch = 0.7 + 0.45 * (0.5 + 0.5 * bend.x);
  float near = causticsLight(causticsNet(q, t), perCell, glow, sun, pinch);

  // A larger, fainter net lower down, turned and drifting more slowly.
  // Where the two cross, the light adds up into hot spots.
  vec2 s = mat2(0.82, -0.57, 0.57, 0.82) * (p * 0.7) + flow * 0.55 - bend.yx * 0.28 + vec2(13.1, 7.9);
  float far = causticsLight(causticsNet(s, t * 0.7 + 3.0), perCell * 0.7, glow * 0.8, sun, 1.0);

  // The mask clears the light, never the water, so masked areas still
  // read as the pool floor.
  float keep = 1.0;
  if (causticsMask > 2.5) {
    keep = smoothstep(0.04, 0.5, uv.y);
  } else if (causticsMask > 1.5) {
    keep = smoothstep(0.96, 0.5, uv.y);
  } else if (causticsMask > 0.5) {
    vec2 c = (uv - 0.5) * vec2(aspect, 1.0) / vec2(max(0.45, aspect * 0.4), 0.26);
    keep = smoothstep(0.8, 1.45, length(c));
  }

  float water = 0.01 + 0.04 * sun;
  float tone = water + (near + far * 0.4) * keep;
  return clamp(tone, 0.0, 1.0) * causticsIntensity;
}
`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** The drift as a unit vector in field space, where y points up. */
const flowVector = (angle: number) => {
  const radians = (angle * Math.PI) / 180;
  return [Math.sin(radians), -Math.cos(radians)] as const;
};

/**
 * A tileable net of creases from SVG turbulence: alpha is high only where
 * the noise folds back on itself, which draws thin, branching, closed
 * loops much like a caustic net. Used as a CSS mask, so the theme colour
 * paints it.
 */
const FALLBACK_NET = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'><filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='turbulence' baseFrequency='0.011' numOctaves='1' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -34 0 0 0 1.6'/></filter><rect width='512' height='512' filter='url(#n)'/></svg>"
)}")`;

/** Where the fallback net fades out, matching the shader's `mask`. */
const FALLBACK_MASKS = {
  bottom: "linear-gradient(to top, transparent 4%, black 50%)",
  center:
    "radial-gradient(ellipse 52% 46% at 50% 50%, transparent 45%, black 95%)",
  none: "linear-gradient(black, black)",
  top: "linear-gradient(to bottom, transparent 4%, black 50%)",
} as const satisfies Record<CausticsMask, string>;

/** The caustic net in CSS, in the palette's colours, shown without WebGL. */
const CausticsFallback = ({
  palette,
  scale,
  intensity,
  mask,
}: {
  palette: DitherPalette;
  scale: number;
  intensity: number;
  mask: CausticsMask;
}) => {
  const ink = cssColor(palette.at(-1) ?? palette[1]);
  const mid = cssColor(palette[1]);
  const tile = `${Math.round(1800 / scale)}px`;
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: cssColor(palette[0]),
        backgroundImage: `radial-gradient(ellipse at 30% 25%, color-mix(in oklab, ${mid} 40%, transparent), transparent 70%)`,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: ink,
          maskComposite: "intersect",
          maskImage: `${FALLBACK_NET}, ${FALLBACK_MASKS[mask]}`,
          maskRepeat: "repeat, no-repeat",
          maskSize: `${tile} ${tile}, 100% 100%`,
          opacity: 0.8 * intensity,
        }}
      />
    </div>
  );
};

/**
 * The shifting net of light on the floor of a sunlit pool: thin, bright
 * filaments that pinch into hot spots where they meet, wobbling over dim
 * water. Decorative and full-bleed: size it with `className`, usually
 * `absolute inset-0`.
 */
export const Caustics = ({
  scale = 4,
  focus = 0.7,
  angle = 160,
  intensity = 1,
  mask = "none",
  palette = CAUSTICS_PALETTE,
  matrix = "bayer8",
  stillTime = 9,
  ...props
}: CausticsProps) => {
  const sharp = clamp(focus, 0, 1);
  const causticsScale = clamp(scale, 1, 16);
  const causticsIntensity = clamp(intensity, 0, 1);

  return (
    <DitherShader
      {...props}
      field={FIELD}
      palette={palette}
      matrix={matrix}
      stillTime={stillTime}
      uniforms={{
        causticsFlow: flowVector(angle),
        causticsFocus: sharp,
        causticsIntensity,
        causticsMask: MASKS[mask],
        causticsScale,
        causticsWidth: 3 - sharp * 2,
      }}
      fallback={
        <CausticsFallback
          palette={palette}
          scale={causticsScale}
          intensity={causticsIntensity}
          mask={mask}
        />
      }
    />
  );
};
