"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { cssColor, DitherShader, readDitherCell } from "@/lib/dither";
import type {
  DitherColor,
  DitherPalette,
  DitherShaderProps,
} from "@/lib/dither";

/** A point in the box: x from the left, y from the top, both 0 to 1. */
export type MoirePoint = readonly [number, number];

/**
 * The two gratings. `lines`: two sets of straight lines a few degrees
 * apart. `rings`: two sets of concentric rings whose centres drift apart
 * and together. `mesh`: two square grids, like a pair of window screens.
 */
export type MoireVariant = "lines" | "rings" | "mesh";

/** Where the pattern fades to paper so text on top stays clean. */
export type MoireMask = "none" | "center" | "top" | "bottom" | "edges";

export type MoireProps = Omit<
  DitherShaderProps,
  "field" | "colorField" | "uniforms" | "fallback"
> & {
  /** The two gratings laid over each other. Default `"lines"`. */
  variant?: MoireVariant;
  /** Spacing of each grating's lines, in whole dither cells, 3 to 12 (4 to 12 for `"mesh"`). Default 4. */
  pitch?: number;
  /**
   * Roughly how many interference bands cross the box, 1 to 8. Fewer
   * bands are bigger. Lines and mesh turn the gratings further apart for
   * more; rings move their centres further apart. Default 3.
   */
  bands?: number;
  /**
   * Direction of the lines in degrees, as in CSS: 0 runs up, 90 across.
   * For rings, the direction from one ring centre to the other. Default 30.
   */
  angle?: number;
  /** The point the gratings turn around, or the midpoint between the ring centres. Default `[0.5, 0.5]`. */
  center?: MoirePoint;
  /**
   * How fast the gratings slide against each other, so the bands sweep
   * across the box. 0 stops the slide; the bands still turn and breathe.
   * Default 1.
   */
  drift?: number;
  /**
   * How much the second grating bends, so the bands curve and twist
   * instead of running straight, 0 (flat) to 2. Default 0.6.
   */
  warp?: number;
  /** Fade it out where text sits. Default `"none"`. */
  mask?: MoireMask;
  /**
   * Colour each interference band from this list in turn, instead of by
   * the palette. Lines where the gratings cross take the band's colour,
   * the rest a tint of it.
   */
  colors?: readonly [DitherColor, ...DitherColor[]];
};

const MODES = { lines: 0, mesh: 2, rings: 1 } as const satisfies Record<
  MoireVariant,
  number
>;

const MASKS = {
  bottom: 3,
  center: 1,
  edges: 4,
  none: 0,
  top: 2,
} as const satisfies Record<MoireMask, number>;

/** How much of a band's colour the lines that don't cross take, in `colors` mode. */
const TINT = 0.4;

const MOIRE_PALETTE = [
  "--dither-paper",
  `color-mix(in oklch, var(--dither-ink) ${TINT * 100}%, var(--dither-paper))`,
  "--dither-ink",
] as const satisfies DitherPalette;

/**
 * Geometry shared by both shader functions. The engine keeps one copy of a
 * definition that appears word for word in `field` and `colorField`.
 */
const GEOMETRY = `
// Cells across and along lines that run in direction a (CSS degrees, in
// radians: 0 runs up the screen).
vec2 moireFrame(vec2 p, float a) {
  return vec2(dot(p, vec2(cos(a), -sin(a))), dot(p, vec2(sin(a), cos(a))));
}

// How far grating B bends at p, in pitches, from -1 to 1 at warp 1: one
// or two broad swells across the box that change shape slowly, like a
// screen that isn't quite flat. Its lines move a cell or two at most, but
// the bands, being their difference from grating A, curve by most of a
// band.
float moireBend(vec2 p, vec2 res, float t) {
  vec2 q = p / max(res.x, res.y) * 1.6 + vec2(3.1, 1.7);
  return moireWarp * snoise(q + vec2(t * 0.012, -t * 0.009));
}

// Where this cell sits in each grating, in pitches: xy for grating A, zw
// for grating B. A line runs wherever x (or z) is a whole number; mesh
// also draws the crossing lines at whole y (or w).
vec4 moirePhases(vec2 uv, vec2 res, float t) {
  // Cells from the pivot: the gratings are drawn in cells, not in uv, so
  // a line is the same width at any box size.
  vec2 p = (uv - vec2(moireCenter.x, 1.0 - moireCenter.y)) * res;
  float slide = t * 0.035 * moireDrift;
  if (moireMode > 0.5 && moireMode < 1.5) {
    // Rings: the centres drift apart and together, and their axis sways.
    float gap = moireBands * moirePitch * (1.0 + 0.35 * sin(t * 0.07));
    float a = moireAngle + 0.3 * sin(t * 0.031 + 0.6);
    vec2 offset = 0.5 * gap * vec2(sin(a), cos(a));
    float bendB = 0.25 * moireBend(p, res, t);
    return vec4(
      length(p - offset) / moirePitch - slide, 0.0,
      length(p + offset) / moirePitch + slide + bendB, 0.0
    );
  }
  // Lines and mesh: two copies turned a little apart. Bands are about
  // pitch / twist apart, so twist is set by how many fit the box. It
  // breathes, and the pair turns slowly, so the bands swell and swing.
  float span = max(res.x, res.y);
  float twist = moireBands * moirePitch / span * (1.0 + 0.3 * sin(t * 0.083));
  float a = moireAngle + 0.1 * sin(t * 0.037 + 1.3);
  vec2 ga = moireFrame(p, a + 0.5 * twist) / moirePitch;
  vec2 gb = moireFrame(p, a - 0.5 * twist) / moirePitch;
  vec2 bendB = 0.6 * vec2(moireBend(p, res, t), moireBend(p.yx, res, t + 40.0));
  return vec4(ga + vec2(slide, 0.6 * slide), gb - vec2(slide, 0.6 * slide) + bendB);
}

// 1 on a line, else 0. Each line covers exactly moireWidth cells across:
// the interval is half open, so a cell centre on its edge counts once.
float moireLine(float phase) {
  float offset = (fract(phase + 0.5) - 0.5) * moirePitch;
  return step(-0.5 * moireWidth, offset) * (1.0 - step(0.5 * moireWidth, offset));
}

// Whether each grating draws a line on this cell: x for A, y for B.
vec2 moireCover(vec4 phase) {
  float a = moireLine(phase.x);
  float b = moireLine(phase.z);
  if (moireMode > 1.5) {
    a = max(a, moireLine(phase.y));
    b = max(b, moireLine(phase.w));
  }
  return vec2(a, b);
}

// 1 across the box, falling to 0 where text goes.
float moireKeep(vec2 uv) {
  vec2 d = vec2((uv.x - 0.5) * 0.85, (uv.y - 0.5) * 1.7);
  if (moireMask > 3.5) {
    return 1.0 - smoothstep(0.32, 0.72, length(d));
  }
  if (moireMask > 2.5) {
    return smoothstep(0.08, 0.6, uv.y);
  }
  if (moireMask > 1.5) {
    return smoothstep(0.08, 0.6, 1.0 - uv.y);
  }
  if (moireMask > 0.5) {
    return smoothstep(0.2, 0.66, length(d));
  }
  return 1.0;
}
`;

const FIELD = `${GEOMETRY}
float field(vec2 uv, vec2 res, float t) {
  vec2 cover = moireCover(moirePhases(uv, res, t));
  // A line of one grating is the tint, a cell where both cross is ink.
  // Where the gratings line up, their lines overlap into crisp ink stripes
  // on open paper; where they fall half a pitch apart, they fill the gaps
  // with tint. Those two states, far apart, are the bands. With colors,
  // every line is inked and colorField picks the tint.
  float tone = moireColors > 0.5 ? max(cover.x, cover.y) : 0.5 * (cover.x + cover.y);
  return tone * moireKeep(uv);
}
`;

// The palette in colors mode is the paper, the paper again, then the band
// colours, so paletteColor(0.0) is the paper and band k's colour sits at
// (k + 1) / count.
const COLOR_FIELD = `${GEOMETRY}
vec3 moireInk(float band) {
  return paletteColor((mod(band, moireColors) + 1.0) / moireColors).rgb;
}

vec3 colorField(vec2 uv, vec2 res, float t) {
  vec4 phase = moirePhases(uv, res, t);
  vec2 cover = moireCover(phase);
  // Which band the cell is in: a whole number where the gratings line up.
  // Mesh bands form a lattice; summing both axes runs the colours along
  // its diagonals.
  float band = phase.x - phase.z;
  if (moireMode > 1.5) {
    band += phase.y - phase.w;
  }
  // Colours change halfway between two bands, where the pattern is a flat
  // tint, so no change cuts across the crisp stripes. Each cell takes one
  // of the two colours, picked by a fixed per-cell threshold, so they mix
  // as dots instead of blending into a muddy in-between.
  float k = floor(band);
  float share = smoothstep(0.4, 0.6, band - k);
  vec3 ink = moireInk(k + step(hash21(floor(uv * res) + 7.3), share));
  float crossed = cover.x * cover.y;
  return mix(paletteColor(0.0).rgb, ink, mix(moireTint, 1.0, crossed));
}
`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const CENTRE: MoirePoint = [0.5, 0.5];

const FALLBACK_MASKS = {
  bottom: "linear-gradient(to top, transparent 8%, black 60%)",
  center:
    "radial-gradient(ellipse 60% 40% at 50% 50%, transparent 32%, black 92%)",
  edges: "radial-gradient(ellipse 60% 40% at 50% 50%, black 50%, transparent)",
  none: "none",
  top: "linear-gradient(to bottom, transparent 8%, black 60%)",
} as const satisfies Record<MoireMask, string>;

const px = (value: number) => `${value.toFixed(2)}px`;

const degrees = (radians: number) =>
  `${((radians * 180) / Math.PI).toFixed(3)}deg`;

/** `value` wrapped into [0, period). */
const wrap = (value: number, period: number) =>
  ((value % period) + period) % period;

/**
 * Stops for one grating along a repeating gradient: a line `width` wide
 * centred `offset` past every multiple of `pitch`, all in px. The stop list
 * starts half a pitch past the line, so every position is positive.
 */
const lineStops = ({
  offset,
  pitch,
  width,
}: {
  offset: number;
  pitch: number;
  width: number;
}) => {
  const start = wrap(offset, pitch) + pitch / 2;
  const line = start + pitch / 2;
  return `transparent ${px(start)} ${px(line - width / 2)}, #000 ${px(line - width / 2)} ${px(line + width / 2)}, transparent ${px(line + width / 2)} ${px(start + pitch)}`;
};

/** `colors` in turn, `size` px each, with colour 0 starting at `start`. */
const bandStops = (colors: readonly string[], start: number, size: number) =>
  colors
    .map(
      (color, index) =>
        `${color} ${px(start + index * size)} ${px(start + (index + 1) * size)}`
    )
    .join(", ");

/**
 * Band colours around the ring midpoint, as a conic gradient starting at
 * the direction of ring centre A. Far from the centres, the band index is
 * -gap / pitch * cos(angle) - 2 * slide, so each colour is a wedge.
 */
const ringBandStops = ({
  colors,
  gap,
  slide,
}: {
  colors: readonly string[];
  /** Distance between the ring centres, in pitches. */
  gap: number;
  slide: number;
}) => {
  const band = (turn: number) => -gap * Math.cos(turn) - 2 * slide;
  const edges = [0, 2 * Math.PI];
  for (let half = Math.floor(-gap - 2 * slide); half <= gap; half += 1) {
    const cos = -(half + 0.5 + 2 * slide) / gap;
    if (Math.abs(cos) < 1) {
      const turn = Math.acos(cos);
      edges.push(turn, 2 * Math.PI - turn);
    }
  }
  edges.sort((a, b) => a - b);
  return edges
    .slice(1)
    .map((end, index) => {
      const start = edges[index] ?? 0;
      const pick = Math.round(band((start + end) / 2));
      const color = colors[wrap(pick, colors.length)] ?? "transparent";
      return `${color} ${degrees(start)} ${degrees(end)}`;
    })
    .join(", ");
};

interface BoxSize {
  readonly width: number;
  readonly height: number;
}

// Server and first client frame assume a wide box, so hydration matches;
// the measured box replaces it straight after.
const FIRST_BOX: BoxSize = { height: 540, width: 960 };

const useBoxSize = (ref: { current: HTMLElement | null }) => {
  const [size, setSize] = useState<BoxSize>(FIRST_BOX);
  useEffect(() => {
    const element = ref.current;
    if (!element) {
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
          last.width === width && last.height === height
            ? last
            : { height, width }
        );
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
};

/** A square layer `radius` px from its centre to each side, centred on `center`. */
const squareAt = (
  center: MoirePoint,
  radius: number,
  turn = 0
): CSSProperties => ({
  height: px(2 * radius),
  left: `${(center[0] * 100).toFixed(2)}%`,
  position: "absolute",
  top: `${(center[1] * 100).toFixed(2)}%`,
  transform: `translate(-50%, -50%) rotate(${degrees(turn)})`,
  width: px(2 * radius),
});

interface FallbackPose {
  /** In radians, as the shader's `moireAngle`. */
  readonly angle: number;
  readonly bands: number;
  readonly center: MoirePoint;
  /** Band colours, or the one ink. */
  readonly inks: readonly string[];
  /** Pitch in cells; `step` and `line` are the pitch and line width in px. */
  readonly pitch: number;
  readonly step: number;
  readonly line: number;
  /** Cell size in px. */
  readonly size: number;
  /** Distance from the pivot to the farthest corner, in px. */
  readonly reach: number;
  readonly slide: number;
  readonly time: number;
}

interface FallbackLayer {
  /** The grating: a layer masked to its lines. */
  readonly style: CSSProperties;
  /** Its colour, inside it: the ink, or the band colours. */
  readonly band: CSSProperties;
}

/** The normal of lines running along `a` (CSS angle in radians), on screen. */
const normalOf = (a: number) => [Math.cos(a), Math.sin(a)] as const;
/** The direction of lines running along `a`, on screen, y down. */
const directionOf = (a: number) => [Math.sin(a), -Math.cos(a)] as const;

/**
 * Two ring gratings, as in the shader: centre A half the gap along the
 * axis, B opposite, A's rings at whole pitches plus the slide and B's
 * minus it. Band colours are wedges of a conic gradient.
 */
const ringLayers = ({
  angle,
  bands,
  center,
  inks,
  line,
  pitch,
  reach,
  size,
  slide,
  step,
  time,
}: FallbackPose): FallbackLayer[] => {
  const gap = bands * pitch * (1 + 0.35 * Math.sin(time * 0.07));
  const turn = angle + 0.3 * Math.sin(time * 0.031 + 0.6);
  const radius = Math.ceil(reach / step + gap) * step;
  const band: CSSProperties = {
    ...squareAt([0.5, 0.5], radius),
    backgroundColor: inks[0],
    backgroundImage:
      inks.length > 1
        ? `conic-gradient(from ${degrees(turn)}, ${ringBandStops({ colors: inks, gap: gap / pitch, slide })})`
        : undefined,
  };
  return [1, -1].map((sign) => {
    const x = radius + ((sign * gap) / 2) * Math.sin(turn) * size;
    const y = radius - ((sign * gap) / 2) * Math.cos(turn) * size;
    const image = `repeating-radial-gradient(circle at ${px(x)} ${px(y)}, ${lineStops({ offset: sign * slide * step, pitch: step, width: line })})`;
    return {
      band,
      style: {
        ...squareAt(center, radius),
        WebkitMaskImage: image,
        maskImage: image,
      },
    };
  });
};

/**
 * Two line gratings (or meshes), as in the shader: each a square layer
 * turned to its own angle around the pivot, with a line through the pivot
 * before the slide. Band colours are stripes across the bands, in a child
 * turned back to where the band index grows.
 */
const lineLayers = ({
  angle,
  bands,
  center,
  inks,
  line,
  pitch,
  reach,
  slide,
  span,
  step,
  time,
  mesh,
}: FallbackPose & {
  /** The longer side of the box, in cells. */
  readonly span: number;
  readonly mesh: boolean;
}): FallbackLayer[] => {
  const twist = ((bands * pitch) / span) * (1 + 0.3 * Math.sin(time * 0.083));
  const turn = angle + 0.1 * Math.sin(time * 0.037 + 1.3);
  // In whole pitches, so the layer's middle line sits on the pivot.
  const radius = Math.ceil(reach / step + 1) * step;
  // The band index grows along g, per px: the difference between the two
  // gratings' normals, plus their line directions for mesh.
  const [ax, ay] = normalOf(turn + twist / 2);
  const [bx, by] = normalOf(turn - twist / 2);
  const [cx, cy] = mesh ? directionOf(turn + twist / 2) : [0, 0];
  const [dx, dy] = mesh ? directionOf(turn - twist / 2) : [0, 0];
  const gx = (ax - bx + cx - dx) / step;
  const gy = (ay - by + cy - dy) / step;
  const bandSize = 1 / Math.max(Math.hypot(gx, gy), 1e-6);
  const bandAt = 2 * slide * (mesh ? 1.6 : 1);
  return [1, -1].map((sign) => {
    const own = turn + (sign * twist) / 2;
    const across = `repeating-linear-gradient(90deg, ${lineStops({ offset: radius - sign * slide * step, pitch: step, width: line })})`;
    const image = mesh
      ? `${across}, repeating-linear-gradient(180deg, ${lineStops({ offset: radius + 0.6 * sign * slide * step, pitch: step, width: line })})`
      : across;
    return {
      band: {
        ...squareAt([0.5, 0.5], radius, Math.atan2(gy, gx) - own),
        backgroundColor: inks[0],
        backgroundImage:
          inks.length > 1
            ? `repeating-linear-gradient(90deg, ${bandStops(inks, radius - (0.5 + bandAt) * bandSize, bandSize)})`
            : undefined,
      },
      style: {
        ...squareAt(center, radius, own),
        WebkitMaskImage: image,
        maskImage: image,
      },
    };
  });
};

/**
 * The same two gratings in CSS, shown without WebGL, posed as the shader
 * is at `time`. Each grating is a layer masked to its lines at half
 * strength, and the second adds onto the first with `plus-lighter`, so a
 * line of one grating is a tint and a cell where both cross is full ink,
 * as in the shader, and the moiré bands appear from the overlap. With
 * `colors`, each layer holds the band colours, turned back to where the
 * shader puts them. The lines stay straight: there is no warp.
 */
const MoireFallback = ({
  variant,
  pitch,
  width,
  bands,
  angle,
  center,
  drift,
  time,
  cell,
  mask,
  palette,
  colors,
}: {
  variant: MoireVariant;
  pitch: number;
  width: number;
  bands: number;
  /** In radians, as the shader's `moireAngle`. */
  angle: number;
  center: MoirePoint;
  drift: number;
  time: number;
  /** Dither cell size in CSS pixels; when unset, read from `--dither-cell`. */
  cell: number | undefined;
  mask: MoireMask;
  palette: DitherPalette;
  colors: readonly DitherColor[] | undefined;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const box = useBoxSize(ref);
  // The shader reads `--dither-cell` when `cell` is unset, so the fallback
  // does too, once mounted; 3 is the engine's default until then.
  const [inherited, setInherited] = useState(3);
  useEffect(() => {
    if (cell === undefined && ref.current) {
      setInherited(readDitherCell(ref.current));
    }
  }, [cell]);
  const size = cell ?? inherited;
  const step = pitch * size;
  const line = width * size;
  const inks = (colors ?? [palette.at(-1) ?? palette[1]]).map(cssColor);
  const maskImage = FALLBACK_MASKS[mask];
  const slide = time * 0.035 * drift;

  // Far enough from the pivot to reach every corner.
  const reach = Math.max(
    ...[0, 1].flatMap((x) =>
      [0, 1].map((y) =>
        Math.hypot((x - center[0]) * box.width, (y - center[1]) * box.height)
      )
    )
  );
  const pose = {
    angle,
    bands,
    center,
    inks,
    line,
    pitch,
    reach,
    size,
    slide,
    step,
    time,
  };
  const layers =
    variant === "rings"
      ? ringLayers(pose)
      : lineLayers({
          ...pose,
          mesh: variant === "mesh",
          span: Math.max(box.width, box.height) / size,
        });

  return (
    <div
      ref={ref}
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundColor: cssColor(palette[0]) }}
    >
      <div
        className="absolute inset-0 isolate"
        style={{ WebkitMaskImage: maskImage, maskImage }}
      >
        {layers.map(({ style, band }, index) => (
          <div
            key={index === 0 ? "a" : "b"}
            style={{
              ...style,
              mixBlendMode: index === 0 ? undefined : "plus-lighter",
              opacity: 0.5,
            }}
          >
            <div style={band} />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Two fine gratings laid over each other and sliding slowly, so huge,
 * smooth interference bands bloom, sweep and turn across the box, as when
 * two window screens overlap. The gratings are drawn in whole dither
 * cells, so the fine lines stay crisp and the bands come only from how
 * they overlap. Decorative and full-bleed: size it with `className`,
 * usually `absolute inset-0`.
 */
export const Moire = ({
  variant = "lines",
  pitch = 4,
  bands = 3,
  angle = 30,
  center = CENTRE,
  drift = 1,
  warp = 0.6,
  mask = "none",
  colors,
  palette = MOIRE_PALETTE,
  matrix = "bayer8",
  stillTime = 9,
  ...props
}: MoireProps) => {
  // A mesh at a pitch of 3 has one-cell holes, too small to read as a
  // screen, so it starts at 4.
  const cells = Math.round(clamp(pitch, variant === "mesh" ? 4 : 3, 12));
  // Each line fills half its pitch, so where the gratings line up they
  // leave open paper between their lines (or open squares, in a mesh), and
  // where they fall half a pitch apart they close every gap.
  const width = Math.max(1, Math.floor(cells / 2));
  const count = clamp(bands, 1, 8);
  const shaderPalette: DitherPalette =
    colors === undefined ? palette : [palette[0], palette[0], ...colors];

  return (
    <DitherShader
      {...props}
      field={FIELD}
      colorField={colors === undefined ? undefined : COLOR_FIELD}
      palette={shaderPalette}
      matrix={matrix}
      stillTime={stillTime}
      uniforms={{
        moireAngle: (angle * Math.PI) / 180,
        moireBands: count,
        moireCenter: center,
        moireColors: colors?.length ?? 0,
        moireDrift: Math.max(0, drift),
        moireMask: MASKS[mask],
        moireMode: MODES[variant],
        moirePitch: cells,
        moireTint: TINT,
        moireWarp: clamp(warp, 0, 2),
        moireWidth: width,
      }}
      fallback={
        <MoireFallback
          variant={variant}
          pitch={cells}
          width={width}
          bands={count}
          angle={(angle * Math.PI) / 180}
          center={center}
          drift={Math.max(0, drift)}
          time={stillTime}
          cell={props.cell}
          mask={mask}
          palette={palette}
          colors={colors}
        />
      }
    />
  );
};
