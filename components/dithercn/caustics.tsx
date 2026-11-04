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
  /** Direction the light drifts, in degrees as in CSS: 90 moves it right, 180 down. Default 160. */
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

// One sheet of focused light. Seeds circle slowly in a lattice, and light
// gathers along the borders between neighbours, which the warps in field()
// bend into wobbling curves. Returns the distance to the
// nearest border (x), the distance to the nearest seed (y, largest where
// borders meet), and the direction across the border toward this point's
// seed (zw).
vec4 causticsSheet(vec2 p, float t) {
  vec2 g = floor(p);
  vec2 f = fract(p);
  vec2 r1 = vec2(8.0);
  vec2 r2 = vec2(8.0);
  float d1 = 64.0;
  float d2 = 64.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 h = causticsHash(g + o);
      vec2 r = o + 0.5 + 0.42 * sin(t * (0.14 + 0.12 * h.yx) + 6.2831853 * h) - f;
      float d = dot(r, r);
      if (d < d1) {
        d2 = d1; r2 = r1;
        d1 = d; r1 = r;
      } else if (d < d2) {
        d2 = d; r2 = r;
      }
    }
  }
  vec2 across = normalize(r2 - r1);
  return vec4(dot(0.5 * (r1 + r2), across), sqrt(d1), -across);
}

// The light a sheet throws: a sharp crest about width dither cells across,
// brighter and wider far from the seeds, so it is hottest where borders meet
// and faint along short ones, plus a soft spill on the side facing spread
// only, as focused light fans out past the crest. gate dims whole stretches,
// so some borders fade out and leave cells open.
float causticsLight(vec4 sheet, float perCell, float width, float glow, float gate, vec2 spread) {
  float reach = clamp((sheet.y - 0.25) / 0.45, 0.0, 1.0);
  float strength = (0.35 + 0.65 * reach * sqrt(reach)) * (0.15 + 0.85 * gate);
  float w = width * (0.75 + 0.45 * reach * (0.3 + 0.7 * gate));
  float d = sheet.x / (perCell * w);
  float crest = exp(-d * d);
  float side = smoothstep(0.0, 1.0, (dot(sheet.zw, spread) + 0.2) / 0.9);
  float spill = side * exp(-sheet.x * glow) * 0.35;
  return (crest + spill) * strength;
}

float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * causticsScale;
  vec2 flow = causticsFlow * t * 0.05;
  // One pattern unit is res.y / scale cells.
  float perCell = causticsScale / res.y;

  // A slow swell bends the borders into curves, and quicker ripples make
  // them wobble along their length, the way waves above bend the light.
  vec2 bend = vec2(
    snoise(p * 0.5 + vec2(t * 0.06, 1.7)),
    snoise(p * 0.5 + vec2(4.3, -t * 0.05))
  );
  vec2 ripple = vec2(
    snoise(p * 1.1 + vec2(-t * 0.16, 8.2)),
    snoise(p * 1.1 + vec2(2.6, t * 0.15))
  );
  float width = 2.3 - 1.3 * causticsFocus;
  float glow = 8.0 + 10.0 * causticsFocus;
  // The side each crest spills toward turns slowly with the swell.
  vec2 spread = vec2(cos(1.0 + bend.x * 1.5), sin(1.0 + bend.x * 1.5));

  // The bright upper sheet, drifting with angle.
  vec2 q = p + flow + bend * 0.36 + ripple * 0.14;
  float gateA = clamp((snoise(p * 0.7 + vec2(t * 0.05 + 3.0, -1.0)) + 0.45) / 0.8, 0.0, 1.0);
  float a = causticsLight(causticsSheet(q, t), perCell, width, glow, gateA, spread);

  // A finer, fainter sheet below it, turned, wobbling to its own ripples and
  // drifting at half the speed, about 35 degrees off angle, so the
  // places where the two sheets cross keep sliding.
  vec2 s = mat2(0.82, -0.57, 0.57, 0.82) * p * 1.35 + flow * 0.5
    - bend.yx * 0.3 + vec2(-ripple.y, ripple.x) * 0.3 + vec2(13.1, 7.9);
  float gateB = clamp((snoise(p * 0.6 + vec2(-t * 0.04, 5.0)) + 0.5) / 0.9, 0.0, 1.0);
  float b = causticsLight(causticsSheet(s, t * 0.75 + 3.0), perCell * 1.35, width * 0.8, glow * 1.2, gateB, spread);

  // Sunlight comes through in broad patches, never evenly: it dapples the
  // floor and brightens the light in some areas more than others.
  float sun = 0.5 + 0.5 * snoise(p * 0.2 + flow * 0.4 + vec2(t * 0.012, 2.1));
  // Where the sheets cross, the light adds up into hot knots.
  float light = a + 0.45 * b + 1.6 * a * b;

  float keep = 1.0;
  if (causticsMask > 2.5) {
    keep = smoothstep(0.04, 0.5, uv.y);
  } else if (causticsMask > 1.5) {
    keep = 1.0 - smoothstep(0.5, 0.96, uv.y);
  } else if (causticsMask > 0.5) {
    vec2 c = (uv - 0.5) * vec2(aspect, 1.0) / vec2(max(0.45, aspect * 0.4), 0.26);
    keep = smoothstep(0.8, 1.45, length(c));
  }

  // The mask clears the light, never the water, so masked areas still
  // read as the pool floor.
  float water = 0.01 + 0.11 * sun * sun;
  float tone = water + 1.5 * light * (0.5 + 0.5 * sun) * keep;
  return clamp(tone, 0.0, 1.0) * causticsIntensity;
}
`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * The bright sheet samples at `p + flow`, so it moves against this vector:
 * it points opposite the CSS direction, in field space where y points up.
 */
const flowVector = (angle: number) => {
  const radians = (angle * Math.PI) / 180;
  return [-Math.sin(radians), -Math.cos(radians)] as const;
};

/**
 * A tileable sheet of creases from SVG turbulence: alpha is high only where
 * the noise folds back on itself, which draws thin, branching filaments of
 * uneven width, like a caustic. Used as a CSS mask, so the theme colour
 * paints it. Browsers compute turbulence in 8 bits, which caps how thin a
 * crease can get, so the sheet is drawn large (1600px) and the filaments
 * stay thinner than a 512px tile stretched up would draw them.
 */
const fallbackNet = (frequency: number, seed: number, slope: number) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='1600'><filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='turbulence' baseFrequency='${frequency}' numOctaves='1' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${slope} 0 0 0 1.6'/></filter><rect width='1600' height='1600' filter='url(#n)'/></svg>`
  )}")`;

/**
 * The fallback's layers, as in the shader: a soft spill around the bright
 * sheet (the same noise with a gentle falloff), the bright sheet itself,
 * whose creases narrow as `focus` rises, and a fainter, larger sheet.
 */
const fallbackSheets = (focus: number) => [
  { id: "spill", image: fallbackNet(0.0064, 7, -18), opacity: 0.2, tile: 4800 },
  {
    id: "bright",
    image: fallbackNet(0.0064, 7, -Math.round(50 + 90 * focus)),
    opacity: 0.9,
    tile: 4800,
  },
  { id: "far", image: fallbackNet(0.0051, 3, -180), opacity: 0.35, tile: 7000 },
];

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
  focus,
  intensity,
  mask,
}: {
  palette: DitherPalette;
  scale: number;
  focus: number;
  intensity: number;
  mask: CausticsMask;
}) => {
  const ink = cssColor(palette.at(-1) ?? palette[1]);
  const mid = cssColor(palette[1]);
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: cssColor(palette[0]),
        backgroundImage: `radial-gradient(ellipse at 30% 25%, color-mix(in oklab, ${mid} ${(40 * intensity).toFixed(1)}%, transparent), transparent 70%)`,
      }}
    >
      {fallbackSheets(focus).map((sheet) => {
        const tile = `${Math.round(sheet.tile / scale)}px`;
        return (
          <div
            key={sheet.id}
            className="absolute inset-0"
            style={{
              backgroundColor: ink,
              maskComposite: "intersect",
              maskImage: `${sheet.image}, ${FALLBACK_MASKS[mask]}`,
              maskRepeat: "repeat, no-repeat",
              maskSize: `${tile} ${tile}, 100% 100%`,
              opacity: sheet.opacity * intensity,
            }}
          />
        );
      })}
    </div>
  );
};

/**
 * The shifting light on the floor of a sunlit pool: sharp filaments of
 * uneven strength that spill softly to one side, break off, and pinch into
 * hot knots where two rippling sheets of light cross, over dappled water.
 * Decorative and full-bleed: size it with `className`, usually
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
          focus={sharp}
          intensity={causticsIntensity}
          mask={mask}
        />
      }
    />
  );
};
