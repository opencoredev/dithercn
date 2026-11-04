"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cssColor, DitherShader, readDitherCell } from "@/lib/dither";
import type { DitherPalette, DitherShaderProps } from "@/lib/dither";

export type RainProps = Omit<
  DitherShaderProps,
  "field" | "colorField" | "uniforms" | "fallback"
> & {
  /** How many drops are on the glass, 0 (dry glass) to 2. Scales the beads and the drops that slide. Default 1. */
  drops?: number;
  /** How bright the city lights behind the glass are, 0 to 2. Default 1. */
  glow?: number;
  /** Size of the lights behind the glass. Higher values make more, smaller ones. Default 1. */
  scale?: number;
  /** How far the drops clear and the lights dim in the middle of the box, 0 to 1, to make room for text. Default 0. */
  fade?: number;
};

/**
 * Everything both shader functions draw, shared word for word so the engine
 * keeps one copy. Lights are measured in box heights, so the city scales
 * with the box. Drops are measured in dither cells, so a drop keeps its size
 * on a phone and the glass shows more of them on a wide screen.
 */
const SCENE = `
// The city behind the glass: a few big, soft discs of out-of-focus light,
// at most one per grid square, more of them low down along the street than
// up in the sky. Each is brightest in the middle and fades smoothly to its
// edge, over a faint glow that rises from the street. Returns the light's
// tone and which ink it is, 0 to 1. dice is a fixed random value per cell:
// where two lights meet, it mixes their colours as dots.
vec2 rainLights(vec2 p, float t, float dice) {
  vec2 q = p * rainScale / 0.3;
  vec2 base = floor(q);
  float sum = 0.0;
  float best = 0.0;
  float second = 0.0;
  float pick = 0.0;
  float other = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 sq = base + vec2(float(i), float(j));
      float seed = hash21(sq + vec2(0.37, 4.1));
      vec2 jitter = vec2(hash21(sq + vec2(7.1, 3.3)), hash21(sq + vec2(1.9, 8.4)));
      // A slow sway of a few hundredths of a square, as if the camera breathed.
      vec2 sway = 0.03 * vec2(sin(t * 0.05 + seed * 40.0), cos(t * 0.04 + jitter.x * 30.0));
      vec2 centre = sq + 0.2 + 0.6 * jitter + sway;
      float height = centre.y * 0.3 / rainScale;
      float chance = mix(0.85, 0.3, smoothstep(0.1, 0.85, height));
      float radius = 0.3 + 0.25 * hash21(sq + vec2(5.5, 2.7));
      float d = length(q - centre) / radius;
      float lit = step(seed, chance) * (0.45 + 0.55 * hash21(sq + vec2(2.2, 6.6)));
      // Lens blur: full in the middle, thinning out smoothly to the edge.
      float dome = max(1.0 - d * d, 0.0);
      sum += dome * sqrt(dome) * lit;
      float weight = lit * exp(-d * d * 1.5);
      float h = hash21(sq + vec2(9.7, 1.3));
      if (weight > best) {
        second = best;
        other = pick;
        best = weight;
        pick = h;
      } else if (weight > second) {
        second = weight;
        other = h;
      }
    }
  }
  pick = dice * (best + second) < second ? other : pick;
  // The sky is darker than the street, and a faint glow rises from it.
  sum *= mix(0.55, 1.0, 1.0 - smoothstep(0.3, 1.0, p.y));
  sum += 0.08 * (1.0 - smoothstep(0.0, 0.45, p.y));
  return vec2(sum * rainGlow, pick);
}

// Which way the lights near p lie, and how strongly they shine there: the sum
// of a pull towards each light, weighted by its brightness and fading over
// about a grid square. A bead turns its highlight along it.
vec2 rainLightPull(vec2 p) {
  vec2 q = p * rainScale / 0.3;
  vec2 base = floor(q);
  vec2 pull = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 sq = base + vec2(float(i), float(j));
      float seed = hash21(sq + vec2(0.37, 4.1));
      vec2 jitter = vec2(hash21(sq + vec2(7.1, 3.3)), hash21(sq + vec2(1.9, 8.4)));
      vec2 to = sq + 0.2 + 0.6 * jitter - q;
      float height = (sq.y + 0.2 + 0.6 * jitter.y) * 0.3 / rainScale;
      float chance = mix(0.85, 0.3, smoothstep(0.1, 0.85, height));
      float lit = step(seed, chance) * (0.45 + 0.55 * hash21(sq + vec2(2.2, 6.6)));
      pull += to / max(length(to), 0.05) * lit * exp(-dot(to, to) * 1.2);
    }
  }
  return pull * rainGlow;
}

// 1 across the box, dropping towards an oval in the middle as fade grows.
float rainClear(vec2 uv) {
  vec2 q = (uv - 0.5) * vec2(2.0, 2.4);
  return mix(1.0, smoothstep(0.55, 1.35, length(q)), rainFade);
}

// The beads on the glass, at most one per grid square of size cells,
// anywhere in its square and no wider than half of it, so a cell only checks
// the four squares around its nearest corner. Returns the nearest bead
// covering the cell: its offset from the bead's centre in radii (xy), its
// radius in cells (z, 0 for none) and a seed (w). With a lifespan, each
// square's bead lands, stays, dries up, and a new one lands elsewhere in it.
vec4 rainBead(vec2 c, float size, float rMin, float rMax, float salt, float chance, float t, float lifespan) {
  vec2 base = floor(c / size - 0.5);
  vec4 found = vec4(2.0, 2.0, 0.0, 0.0);
  for (int j = 0; j <= 1; j++) {
    for (int i = 0; i <= 1; i++) {
      vec2 sq = base + vec2(float(i), float(j));
      vec2 id = sq;
      float grow = 1.0;
      if (lifespan > 0.0) {
        float span = lifespan * (0.7 + 0.6 * hash21(sq + vec2(salt, 3.1)));
        float phase = t / span + hash21(sq + vec2(6.3, salt));
        float age = fract(phase) * span;
        id += floor(phase) * vec2(13.1, 7.7);
        // It lands in a fifth of a second and dries up over its last three.
        grow = smoothstep(0.0, 0.2, age) * (1.0 - smoothstep(span - 3.0, span, age));
      }
      float r = mix(rMin, rMax, pow(hash21(id + vec2(2.3, salt)), 2.0)) * grow;
      vec2 at = vec2(hash21(id + vec2(salt, 5.9)), hash21(id + vec2(8.1, salt)));
      vec2 off = (c - (sq + at) * size) / max(r, 1e-3);
      float present = step(hash21(id + vec2(salt, 0.7)), chance) * step(0.3, r);
      if (present > 0.5 && dot(off, off) < dot(found.xy, found.xy)) {
        found = vec4(off, r, hash21(id + vec2(salt, salt)));
      }
    }
  }
  return found;
}

// The wavering line a sliding drop follows down the glass.
float rainPathX(float y, float x0, float seed) {
  return x0 + 4.0 * sin(y / 41.0 + seed * 6.2831853) + 1.6 * sin(y / 13.0 + seed * 19.0);
}

// The big drop of one lane, in cells. Each life it lands at y0, gathers water
// for a moment, then slides down at an easy, uneven pace, slowing almost to
// a stop now and then and running on, and a new one lands once its trail has
// dried. Returns its centre (xy), radius (z, 0 for none) and how fast it is
// running (w, 0 to 1). path holds the lane's x0, y0 and seed, to draw its
// trail, and how much of the trail is left as the life ends.
vec4 rainSlider(float cx, float rows, float t, float shift, float salt, out vec4 path) {
  float laneWidth = 110.0;
  float lane = floor((cx + shift) / laneWidth);
  float laneSeed = hash21(vec2(lane, salt));
  float speed = 7.0 + 5.0 * hash21(vec2(salt, lane + 3.1));
  float lifeTime = 6.0 + (rows * 1.2 + 40.0) / speed;
  float phase = t / lifeTime + laneSeed * 7.0;
  float age = fract(phase) * lifeTime;
  vec2 id = vec2(lane, floor(phase));
  float seed = hash21(id + vec2(salt, 1.7));
  float present = step(hash21(id + vec2(3.9, salt)), rainSlide);
  float radius = mix(12.0, 16.0, hash21(id + vec2(salt, 8.3))) * present;
  float y0 = rows * mix(0.5, 1.1, hash21(id + vec2(6.1, salt)));
  float hold = 0.6 + 2.0 * hash21(id + vec2(salt, 4.4));

  // Its speed swings between a quarter and nearly twice the average.
  float s = max(age - hold, 0.0);
  float w = 1.1 + 0.9 * hash21(id + vec2(salt, 9.1));
  float swing = seed * 6.2831853;
  float y = y0 - speed * (s + 0.75 / w * (sin(w * s + swing) - sin(swing)));
  float moving = step(hold, age) * (1.0 + 0.75 * cos(w * s + swing)) / 1.75;

  float x0 = (lane + 0.25 + 0.5 * hash21(id + vec2(salt, 2.2))) * laneWidth - shift;
  path = vec4(x0, y0, seed, 1.0 - smoothstep(lifeTime - 3.0, lifeTime, age));
  // It swells as it gathers water, before it starts to slide.
  return vec4(rainPathX(y, x0, seed), y, radius * smoothstep(0.0, 0.8, age), moving);
}

// How fresh the trail is at height y, 1 just behind the drop and 0 long dry.
float rainTrailFade(float y, vec4 drop, vec4 path) {
  float behind = y - drop.y;
  return step(0.0, behind) * step(y, path.y) * exp(-behind / 110.0) * step(0.5, drop.z) * path.w;
}

// Whether a bead at centre bc has been wiped away by this lane's drop. Beads
// come back one by one as the trail dries.
float rainWiped(vec2 bc, float br, float seed, vec4 drop, vec4 path) {
  float reach = drop.z + br;
  float near = step(abs(bc.x - rainPathX(bc.y, path.x, path.z)), reach);
  float under = step(drop.y - reach, bc.y) * step(bc.y, path.y + reach);
  float fresh = max(rainTrailFade(bc.y, drop, path), step(bc.y, drop.y + reach));
  return near * under * step(0.5, drop.z) * step(seed, fresh * 1.3);
}

// The wet trail a drop leaves, and the few droplets left along it. Returns
// its core line (x) and the soft shoulders either side of it (y), where the
// film of water still bends the lights. Both are widest just behind the drop
// and taper to a thin, dim thread higher up, where the trail is drier.
vec2 rainTrailLine(vec2 c, vec4 drop, vec4 path, out vec4 bead) {
  float fade = rainTrailFade(c.y, drop, path);
  float dx = abs(c.x - rainPathX(c.y, path.x, path.z));
  float halfWidth = mix(0.3, 0.4 + 0.08 * drop.z, fade * fade);
  float line = 1.0 - smoothstep(halfWidth - 0.5, halfWidth + 0.5, dx);
  float fresh = smoothstep(0.25, 1.0, fade);
  float shoulder = (1.0 - smoothstep(0.0, 1.0 + 0.5 * drop.z * fresh, dx)) * fresh;
  float slot = floor(c.y / 16.0);
  float by = (slot + 0.3 + 0.4 * hash21(vec2(slot, path.z * 37.0))) * 16.0;
  float br = mix(2.0, 3.4, hash21(vec2(path.z * 11.0, slot)));
  float kept = step(hash21(vec2(slot, path.z * 71.0)), 0.4) * step(0.1, rainTrailFade(by, drop, path));
  bead = vec4((c - vec2(rainPathX(by, path.x, path.z), by)) / br, br * kept, hash21(vec2(slot, path.z * 53.0)));
  return vec2(line * sqrt(fade) * step(0.03, fade), shoulder);
}

// The offset from a sliding drop's centre in radii. Running drops stretch
// upwards into a short tail; resting ones sit a little flat at the bottom.
vec2 rainSliderOffset(vec2 c, vec4 drop) {
  vec2 o = c - drop.xy;
  o.y *= o.y > 0.0 ? 1.0 / (1.0 + 0.5 * drop.w) : 1.1;
  return o / max(drop.z, 1e-3);
}

// A drop is a tiny lens: inside, it shows the lights behind it upside down,
// shrunk and brighter, and its edge bends the light away into a dark rim
// about a cell and a half wide. Just inside the rim it gathers a thin arc of
// light on the side facing toward (a unit vector), reaching reach round it
// (the cosine of the arc's half angle, lower for a longer arc), and a short
// glint across from it. So a drop over a light glows, ringed in dark, and a
// drop over the dark sky is only that arc and glint. ring is how bright a
// faint line round the rest of it is. thick is 1 for the big sliding drops,
// which gather a little more.
float rainDropTone(vec2 off, float r, float light, float thick, vec2 toward, float reach, float ring) {
  float d = length(off);
  vec2 dir = off / max(d, 1e-3);
  float inset = (1.0 - d) * r;
  float rim = 1.0 - smoothstep(1.0, 1.6, inset);
  float body = light * mix(2.2, 1.6, d);
  float band = 1.0 - smoothstep(2.4, 2.8, inset - thick);
  float facing = dot(dir, toward);
  float arc = smoothstep(reach, reach + 0.25, facing) * band;
  body = max(body, max(arc * (0.8 + light), band * ring));
  float across = smoothstep(0.88, 0.95, dot(dir, vec2(toward.y, -toward.x) * 0.6 - toward * 0.8));
  float glint = across * (1.0 - smoothstep(2.2, 2.6, inset - thick));
  return max(body, glint * (0.8 + light)) * (1.0 - rim);
}

// A bead's highlight turns towards the brightest light near it and reaches
// further round the brighter that light is; over the dark sky, each bead
// faces its own way with a short arc. Returns the direction (xy) and the arc's
// reach (z) for rainDropTone.
vec3 rainBeadFacing(vec2 centre, float seed) {
  vec2 pull = rainLightPull(centre);
  float strength = smoothstep(0.05, 0.6, length(pull));
  float a = seed * 6.2831853;
  vec2 toward = normalize(pull + vec2(cos(a), sin(a)) * 0.15 + vec2(0.0, 1e-4));
  float reach = mix(0.6, -0.1, strength) + 0.3 * (fract(seed * 7.13) - 0.5);
  return vec3(toward, reach);
}

// The whole scene: x is the tone, y which ink colours it.
vec2 rainScene(vec2 uv, vec2 res, float t) {
  vec2 c = uv * res;
  vec2 p = c / res.y;
  float clear = rainClear(uv);

  vec4 pathA;
  vec4 pathB;
  vec4 dropA = rainSlider(c.x, res.y, t, 0.0, 1.3, pathA);
  vec4 dropB = rainSlider(c.x, res.y, t, 55.0, 7.9, pathB);

  // The pixel is either in a sliding drop, in a bead, or on bare glass;
  // drops and beads look at the lights through a lens.
  float inDrop = 0.0;
  vec2 off = vec2(0.0);
  float radius = 0.0;
  float thick = 0.0;
  float dropClear = 1.0;
  float seed = 0.0;
  vec2 offA = rainSliderOffset(c, dropA);
  vec2 offB = rainSliderOffset(c, dropB);
  if (dropA.z > 0.5 && length(offA) < 1.0) {
    inDrop = 1.0;
    off = offA;
    radius = dropA.z;
    thick = 1.0;
    dropClear = rainClear(dropA.xy / res);
  } else if (dropB.z > 0.5 && length(offB) < 1.0) {
    inDrop = 1.0;
    off = offB;
    radius = dropB.z;
    thick = 1.0;
    dropClear = rainClear(dropB.xy / res);
  }

  vec4 trailBeadA;
  vec4 trailBeadB;
  vec2 trails = max(rainTrailLine(c, dropA, pathA, trailBeadA), rainTrailLine(c, dropB, pathB, trailBeadB));
  float trail = trails.x;
  // Droplets along a trail clear with the rest where the glass is wiped.
  trailBeadA.z *= step(0.6, clear);
  trailBeadB.z *= step(0.6, clear);

  if (inDrop < 0.5) {
    float chance = clear * rainDrops;
    vec4 still = rainBead(c, 30.0, 6.0, 11.0, 2.7, 0.26 * chance, t, 0.0);
    vec4 landed = rainBead(c + vec2(13.0, 17.0), 38.0, 6.0, 12.0, 5.3, 0.22 * chance, t, 30.0);
    vec4 candidates[4];
    candidates[0] = still;
    candidates[1] = landed;
    candidates[2] = trailBeadA;
    candidates[3] = trailBeadB;
    for (int n = 0; n < 4; n++) {
      vec4 bead = candidates[n];
      if (inDrop < 0.5 && bead.z > 0.3 && length(bead.xy) < 1.0) {
        // Beads on the glass, not those along a trail, can be wiped away.
        vec2 bc = c - bead.xy * bead.z;
        float wiped = 0.0;
        if (n < 2) {
          wiped = max(rainWiped(bc, bead.z, bead.w, dropA, pathA), rainWiped(bc, bead.z, bead.w, dropB, pathB));
        }
        if (wiped < 0.5) {
          inDrop = 1.0;
          off = bead.xy;
          radius = bead.z;
          seed = bead.w;
        }
      }
    }
  }

  // One look at the lights: through the lens, flipped and shrunk, or straight.
  vec2 q = inDrop > 0.5 ? (c - off * radius) / res.y - off * 0.16 : p;
  // A trail takes the colour of the nearest light, so it reads as one line.
  float dice = inDrop < 0.5 && trail > 0.01 ? 0.99 : hash21(floor(c) + vec2(3.7, 9.2));
  vec2 light = rainLights(q, t, dice);
  light.x *= clear;
  if (inDrop > 0.5) {
    // Sliding drops hang their arc at the bottom, where the water gathers.
    vec3 facing = thick > 0.5 ? vec3(0.0, -1.0, 0.45) : rainBeadFacing((c - off * radius) / res.y, seed);
    float tone = rainDropTone(off, radius, light.x, thick, facing.xy, facing.z, 0.16 * (1.0 - thick));
    return vec2(tone * dropClear, light.y);
  }
  // A trail is a clean streak: the light behind shows clearer along it, and
  // the film either side of it near the drop bends a little more light in.
  float wet = trail * (0.9 + light.x) * clear;
  float film = trails.y * (0.35 + 0.9 * light.x) * clear;
  return vec2(max(light.x, max(wet, film)), light.y);
}
`;

const FIELD = `${SCENE}
float field(vec2 uv, vec2 res, float t) {
  return rainScene(uv, res, t).x;
}
`;

// Each light takes one ink, the palette's colours after the paper; a drop
// takes the colour of the light it shows.
const COLOR_FIELD = `${SCENE}
vec3 colorField(vec2 uv, vec2 res, float t) {
  float pick = floor(rainScene(uv, res, t).y * rainInks);
  return paletteColor(pick / max(rainInks - 1.0, 1.0)).rgb;
}
`;

const DEFAULT_PALETTE = [
  "--dither-paper",
  "--dither-ink",
  "orange",
] as const satisfies DitherPalette;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const smoothstep = (from: number, to: number, value: number) => {
  const t = clamp((value - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * The cell size the fallback lays its drops out in, resolved as the engine
 * resolves `cell`: below one pixel it clamps to one, so a `cell` of 0 can't
 * shrink the grid to nothing, and a value that isn't a number falls back to
 * the engine's default of 3.
 */
const fallbackCell = (cell: number) =>
  Number.isFinite(cell) ? Math.max(1, cell) : 3;

/**
 * No loop in the fallback runs more than this many times along an axis,
 * whatever the box or cell size, so no input can stall a render.
 */
const MAX_STEPS = 512;

// A stable value in [0, 1) per grid square, so the server and client agree.
const fallbackHash = (x: number, y: number, salt: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43_758.5453;
  return s - Math.floor(s);
};

interface BoxSize {
  readonly width: number;
  readonly height: number;
}

// Server and first client frame assume 16:9, so hydration matches; the
// measured box replaces it straight after.
const FIRST_BOX: BoxSize = { height: 450, width: 800 };

const useBoxSize = (ref: { current: HTMLElement | null }) => {
  const [size, setSize] = useState<BoxSize | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) {
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
          last?.width === width && last.height === height
            ? last
            : { height, width }
        );
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
};

/** One disc of light behind the glass, in CSS pixels from the top left. */
interface Light {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly tone: number;
  readonly ink: number;
}

/** The side of the grid square that holds at most one light, in CSS pixels. */
const lightSquare = (box: BoxSize, scale: number) => (box.height * 0.3) / scale;

/**
 * The lights as the shader lays them out: one per grid square at most, more
 * of them low down along the street than up in the sky.
 */
const fallbackLights = ({
  box,
  scale,
  glow,
  inks,
}: {
  box: BoxSize;
  scale: number;
  glow: number;
  inks: number;
}): Light[] => {
  const square = lightSquare(box, scale);
  const columns = Math.min(MAX_STEPS, Math.ceil(box.width / square));
  const rows = Math.min(MAX_STEPS, Math.ceil(box.height / square));
  const lights: Light[] = [];
  for (let gy = -1; gy <= rows; gy += 1) {
    for (let gx = -1; gx <= columns; gx += 1) {
      const x = (gx + 0.2 + 0.6 * fallbackHash(gx, gy, 2)) * square;
      const up = (gy + 0.2 + 0.6 * fallbackHash(gx, gy, 3)) * square;
      const height = up / box.height;
      const chance = 0.85 - 0.55 * smoothstep(0.1, 0.85, height);
      if (fallbackHash(gx, gy, 1) < chance) {
        // Dimmer high up, as in the shader's sky.
        const sky = 1 - 0.45 * smoothstep(0.3, 1, height);
        lights.push({
          ink: Math.floor(fallbackHash(gx, gy, 5) * inks),
          r: (0.3 + 0.25 * fallbackHash(gx, gy, 4)) * square,
          tone: (0.45 + 0.55 * fallbackHash(gx, gy, 6)) * sky * glow,
          x,
          y: box.height - up,
        });
      }
    }
  }
  return lights;
};

/** The light seen at a point, and the ink of the strongest light near it. */
const lightAt = (lights: readonly Light[], x: number, y: number) => {
  let tone = 0;
  let ink = 0;
  let best = -1;
  for (const light of lights) {
    const d = Math.hypot(x - light.x, y - light.y) / light.r;
    const dome = Math.max(1 - d * d, 0);
    tone += dome * Math.sqrt(dome) * light.tone;
    const weight = light.tone * Math.exp(-d * d * 1.5);
    if (weight > best) {
      best = weight;
      ({ ink } = light);
    }
  }
  return { ink, tone };
};

/**
 * Which way the lights near a point lie and how strongly they shine there,
 * as the shader's `rainLightPull`: a pull towards each light, weighted by its
 * brightness and fading over about a grid square. y points down.
 */
const lightPull = ({
  lights,
  x,
  y,
  square,
}: {
  lights: readonly Light[];
  x: number;
  y: number;
  square: number;
}) => {
  let px = 0;
  let py = 0;
  for (const light of lights) {
    const dx = (light.x - x) / square;
    const dy = (light.y - y) / square;
    const dist = Math.hypot(dx, dy);
    const weight =
      (light.tone * Math.exp(-dist * dist * 1.2)) / Math.max(dist, 0.05);
    px += dx * weight;
    py += dy * weight;
  }
  return { x: px, y: py };
};

/** A drop sliding down the glass in the still frame, with its trail above it. */
interface Slider {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** Where its trail starts, above the drop. */
  readonly top: number;
  /** Phase of the trail's waver. */
  readonly seed: number;
}

/** A still bead on the glass. */
interface Bead {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** A fixed random value, which turns its highlight when no light is near. */
  readonly seed: number;
}

/**
 * A drop as the still frame draws it: where its highlight arc sits, centred
 * on an angle in degrees (SVG's: 90 is straight down) and spreading either
 * side of it. Beads also carry a faint ring round the rest of their edge.
 */
interface Lens {
  readonly kind: "bead" | "slider";
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly angle: number;
  readonly spread: number;
}

/** How far round from the highlight the short glint sits, in degrees. */
const GLINT_TURN = 143;

/** How far the wavering line a sliding drop follows sits off its lane, in cells. */
const waver = (y: number, seed: number) =>
  4 * Math.sin(y / 41 + seed * Math.PI * 2) +
  1.6 * Math.sin(y / 13 + seed * 19);

/** The drops in the still frame, in CSS pixels, with beads wiped off the trails. */
const fallbackDrops = ({
  box,
  cell,
  drops,
}: {
  box: BoxSize;
  cell: number;
  drops: number;
}) => {
  const lane = 110 * cell;
  const sliders: Slider[] = [];
  for (const [shift, salt] of [
    [0, 20],
    [55, 40],
  ] as const) {
    for (
      let index = -1;
      index * lane < box.width + lane && index < MAX_STEPS;
      index += 1
    ) {
      if (fallbackHash(index, salt, 1) < 0.45 * drops) {
        const y = box.height * (0.3 + 0.65 * fallbackHash(index, salt, 3));
        const seed = fallbackHash(index, salt, 6);
        const x0 =
          (index + 0.25 + 0.5 * fallbackHash(index, salt, 5)) * lane -
          shift * cell;
        sliders.push({
          r: (12 + 4 * fallbackHash(index, salt, 2)) * cell,
          seed,
          top: y - box.height * (0.2 + 0.45 * fallbackHash(index, salt, 4)),
          x: x0 + waver(y / cell, seed) * cell,
          y,
        });
      }
    }
  }
  const wiped = (x: number, y: number, r: number) =>
    sliders.some(
      (slider) =>
        Math.abs(x - slider.x) < slider.r + r + 6 * cell &&
        y > slider.top - r &&
        y < slider.y + slider.r + r
    );
  const beads: Bead[] = [];
  // As in the shader: one bead per square at most, anywhere in it.
  const grid = ({
    size,
    rMin,
    rMax,
    chance,
    salt,
  }: {
    size: number;
    rMin: number;
    rMax: number;
    chance: number;
    salt: number;
  }) => {
    const square = size * cell;
    for (let gy = 0; gy * square < box.height && gy < MAX_STEPS; gy += 1) {
      for (let gx = 0; gx * square < box.width && gx < MAX_STEPS; gx += 1) {
        if (fallbackHash(gx, gy, salt) < chance) {
          const x = (gx + fallbackHash(gx, gy, salt + 1)) * square;
          const y = (gy + fallbackHash(gx, gy, salt + 2)) * square;
          const r =
            (rMin + (rMax - rMin) * fallbackHash(gx, gy, salt + 3) ** 2) * cell;
          if (!wiped(x, y, r)) {
            beads.push({ r, seed: fallbackHash(gx, gy, salt + 4), x, y });
          }
        }
      }
    }
  };
  grid({ chance: 0.26 * drops, rMax: 11, rMin: 6, salt: 60, size: 30 });
  grid({ chance: 0.22 * drops, rMax: 12, rMin: 6, salt: 70, size: 38 });
  return { beads, sliders };
};

/** A tone as an opacity in tenths, so drops of one colour share a path. */
const bucket = (tone: number) => Math.round(clamp(tone, 0, 1) * 10) / 10;

const num = (value: number) => value.toFixed(1);

/** Circles as one path, so many beads cost a few elements. */
const circles = (list: readonly Lens[], inset = 0) =>
  list
    .map(({ x, y, r }) => {
      const radius = Math.max(0.5, r - inset);
      return `M${num(x - radius)} ${num(y)}a${num(radius)} ${num(radius)} 0 1 0 ${num(2 * radius)} 0a${num(radius)} ${num(radius)} 0 1 0 ${num(-2 * radius)} 0`;
    })
    .join("");

/**
 * An arc inside each drop, inset from its edge: its highlight, or with
 * `glint` the short glint across from it.
 */
const arcs = (list: readonly Lens[], inset: number, glint: boolean) =>
  list
    .map(({ x, y, r, angle, spread }) => {
      const radius = Math.max(0.5, r - inset);
      const centre = glint ? angle + GLINT_TURN : angle;
      const half = glint ? 20 : spread;
      const from = ((centre - half) * Math.PI) / 180;
      const to = ((centre + half) * Math.PI) / 180;
      return `M${num(x + radius * Math.cos(from))} ${num(y + radius * Math.sin(from))}A${num(radius)} ${num(radius)} 0 ${half > 90 ? 1 : 0} 1 ${num(x + radius * Math.cos(to))} ${num(y + radius * Math.sin(to))}`;
    })
    .join("");

/**
 * The outline of a slider's trail as one closed shape, from its top down to
 * the drop. `halfWidth` gives its half width in CSS pixels at each point,
 * from 0 at the top to 1 at the drop, so it can taper.
 */
const trailShape = (
  slider: Slider,
  cell: number,
  halfWidth: (along: number) => number
) => {
  const x0 = slider.x - waver(slider.y / cell, slider.seed) * cell;
  // It runs into the drop's top edge, not on through the drop.
  const end = slider.y - 0.75 * slider.r;
  const length = Math.max(end - slider.top, 1);
  const steps = Math.min(MAX_STEPS, Math.ceil(length / (3 * cell)));
  const left: string[] = [];
  const right: string[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const along = step / steps;
    const y = slider.top + along * length;
    const x = x0 + waver(y / cell, slider.seed) * cell;
    const half = halfWidth(along);
    left.push(`${num(x - half)} ${num(y)}`);
    right.push(`${num(x + half)} ${num(y)}`);
  }
  return `M${[...left, ...right.toReversed()].join("L")}Z`;
};

/**
 * A still SVG of the same window, shown without WebGL: a few soft discs of
 * light over a faint glow from the street, beads that show the light behind
 * them brighter inside a dark rim, each with an arc of light on the side
 * facing the nearest bright light, a glint across from it and a faint ring
 * round the rest, and a few big drops with the wet trails they left, which
 * taper from soft and wide at the drop to a thin thread higher up.
 */
const RainFallback = ({
  palette,
  drops,
  glow,
  scale,
  fade,
  cell,
}: {
  palette: DitherPalette;
  drops: number;
  glow: number;
  scale: number;
  fade: number;
  cell: number | undefined;
}) => {
  const id = useId().replaceAll(/[^\w-]/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const box = useBoxSize(ref) ?? FIRST_BOX;
  // The shader reads `--dither-cell` when `cell` is unset, so the fallback
  // does too, once mounted; 3 is the engine's default until then.
  const [inherited, setInherited] = useState(3);
  useEffect(() => {
    if (cell === undefined && ref.current) {
      setInherited(readDitherCell(ref.current));
    }
  }, [cell]);
  const ditherCell = fallbackCell(cell ?? inherited);
  const paper = cssColor(palette[0]);
  const inks = palette.slice(1).map(cssColor);
  const lights = useMemo(
    () => fallbackLights({ box, glow, inks: inks.length, scale }),
    [box, glow, inks.length, scale]
  );
  const scene = useMemo(
    () => fallbackDrops({ box, cell: ditherCell, drops }),
    [box, ditherCell, drops]
  );
  // Drops grouped by colour and brightness, a few paths each.
  const groups = useMemo(() => {
    const square = lightSquare(box, scale);
    const byKey = new Map<
      string,
      { ink: number; tone: number; lenses: Lens[] }
    >();
    const add = (lens: Lens) => {
      const seen = lightAt(lights, lens.x, lens.y);
      const tone = bucket(1.9 * seen.tone);
      const key = `${seen.ink}-${tone}`;
      const group = byKey.get(key) ?? { ink: seen.ink, lenses: [], tone };
      group.lenses.push(lens);
      byKey.set(key, group);
    };
    for (const bead of scene.beads) {
      // As the shader's rainBeadFacing: the highlight turns towards the
      // lights near it and reaches further round the brighter they are.
      const pull = lightPull({ lights, square, x: bead.x, y: bead.y });
      const strength = smoothstep(0.05, 0.6, Math.hypot(pull.x, pull.y));
      const turn = bead.seed * Math.PI * 2;
      const towardX = pull.x + 0.15 * Math.cos(turn);
      const towardY = pull.y - 0.15 * Math.sin(turn);
      const reach =
        0.6 - 0.7 * strength + 0.3 * ((bead.seed * 7.13) % 1) - 0.15;
      add({
        angle: (Math.atan2(towardY, towardX) * 180) / Math.PI,
        kind: "bead",
        r: bead.r,
        spread: (Math.acos(clamp(reach + 0.125, -1, 1)) * 180) / Math.PI,
        x: bead.x,
        y: bead.y,
      });
    }
    for (const slider of scene.sliders) {
      // Sliding drops hang their arc at the bottom, where the water gathers.
      add({
        angle: 90,
        kind: "slider",
        r: slider.r,
        spread: 48,
        x: slider.x,
        y: slider.y,
      });
    }
    return [...byKey.values()];
  }, [box, lights, scale, scene]);
  const ink = (index: number) => inks[index] ?? inks[0] ?? paper;
  // The same oval clears the drops and dims the lights, as in the shader.
  const mask =
    fade > 0
      ? `radial-gradient(50% 41.7% at 50% 50%, rgb(0 0 0 / ${(1 - fade).toFixed(2)}) 55%, #000 135%)`
      : undefined;
  return (
    <div
      ref={ref}
      className="absolute inset-0"
      style={{ backgroundColor: paper }}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 size-full"
        viewBox={`0 0 ${box.width} ${box.height}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ maskImage: mask }}
      >
        <defs>
          {/* Lens blur: full in the middle, thinning out to the edge. */}
          {inks.map((color, index) => (
            <radialGradient key={`light-${index}`} id={`${id}-light-${index}`}>
              <stop offset="0" stopColor={color} />
              <stop offset="0.5" stopColor={color} stopOpacity="0.65" />
              <stop offset="0.8" stopColor={color} stopOpacity="0.22" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </radialGradient>
          ))}
          <linearGradient id={`${id}-haze`} x1="0" x2="0" y1="1" y2="0">
            <stop
              offset="0"
              stopColor={ink(0)}
              stopOpacity={(0.1 * glow).toFixed(2)}
            />
            <stop offset="0.45" stopColor={ink(0)} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width={box.width} height={box.height} fill={`url(#${id}-haze)`} />
        {lights.map((light) => (
          <circle
            key={`${light.x.toFixed(1)}-${light.y.toFixed(1)}`}
            cx={light.x.toFixed(1)}
            cy={light.y.toFixed(1)}
            r={light.r.toFixed(1)}
            fill={`url(#${id}-light-${light.ink})`}
            fillOpacity={clamp(light.tone, 0, 1).toFixed(2)}
          />
        ))}
      </svg>
      <svg
        aria-hidden="true"
        className="absolute inset-0 size-full"
        viewBox={`0 0 ${box.width} ${box.height}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ maskImage: mask }}
      >
        <defs>
          {scene.sliders.map((slider, index) => {
            const color = ink(lightAt(lights, slider.x, slider.y).ink);
            return (
              <linearGradient
                key={`trail-${num(slider.x)}-${num(slider.y)}`}
                id={`${id}-trail-${index}`}
                gradientUnits="userSpaceOnUse"
                x1="0"
                x2="0"
                y1={num(slider.top)}
                y2={num(slider.y)}
              >
                <stop offset="0" stopColor={color} stopOpacity="0" />
                <stop offset="1" stopColor={color} stopOpacity="0.9" />
              </linearGradient>
            );
          })}
          {scene.sliders.map((slider, index) => {
            const color = ink(lightAt(lights, slider.x, slider.y).ink);
            return (
              <linearGradient
                key={`film-${num(slider.x)}-${num(slider.y)}`}
                id={`${id}-film-${index}`}
                gradientUnits="userSpaceOnUse"
                x1="0"
                x2="0"
                y1={num(slider.top)}
                y2={num(slider.y)}
              >
                <stop offset="0.4" stopColor={color} stopOpacity="0" />
                <stop offset="1" stopColor={color} stopOpacity="0.4" />
              </linearGradient>
            );
          })}
          <filter id={`${id}-soft`} x="-1" y="-0.1" width="3" height="1.2">
            <feGaussianBlur stdDeviation={num(1.5 * ditherCell)} />
          </filter>
        </defs>
        {/* The film either side of each trail near its drop, soft and wide. */}
        <g filter={`url(#${id}-soft)`}>
          {scene.sliders.map((slider, index) => (
            <path
              key={`${num(slider.x)}-${num(slider.y)}`}
              d={trailShape(
                slider,
                ditherCell,
                (along) =>
                  (1 +
                    0.5 * (slider.r / ditherCell) * smoothstep(0.4, 1, along)) *
                  ditherCell
              )}
              fill={`url(#${id}-film-${index})`}
            />
          ))}
        </g>
        {/* Each trail's core, a thin thread up high that widens at the drop. */}
        {scene.sliders.map((slider, index) => (
          <path
            key={`${num(slider.x)}-${num(slider.y)}`}
            d={trailShape(
              slider,
              ditherCell,
              (along) =>
                (0.5 + (0.1 + 0.08 * (slider.r / ditherCell)) * along * along) *
                ditherCell
            )}
            fill={`url(#${id}-trail-${index})`}
          />
        ))}
        {groups.map((group) => {
          const beads = group.lenses.filter((lens) => lens.kind === "bead");
          return (
            <g key={`${group.ink}-${group.tone}`} fill="none">
              <path
                d={circles(group.lenses)}
                fill={ink(group.ink)}
                fillOpacity={group.tone}
              />
              <path
                d={circles(group.lenses, ditherCell * 0.65)}
                stroke={paper}
                strokeWidth={num(ditherCell * 1.3)}
              />
              <path
                d={circles(beads, ditherCell * 2)}
                stroke={ink(group.ink)}
                strokeOpacity="0.3"
                strokeWidth={num(ditherCell)}
              />
              <g
                stroke={ink(group.ink)}
                strokeOpacity={clamp(0.8 + group.tone, 0, 1).toFixed(2)}
                strokeWidth={num(ditherCell * 1.2)}
                strokeLinecap="round"
              >
                <path d={arcs(group.lenses, ditherCell * 2, false)} />
                <path d={arcs(group.lenses, ditherCell * 2, true)} />
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/**
 * Rain on a window at night, drawn as a dither: the city behind the glass
 * is a few big, soft discs of out-of-focus light over a glow from the
 * street, and the glass in front holds a scatter of drops, each a tiny lens
 * that shows the light behind it flipped and brighter inside a dark rim.
 * A few bigger drops slide down at an easy, uneven pace and leave wavering
 * wet trails that wipe the beads off their path. Decorative and full-bleed: size it with
 * `className`, usually `absolute inset-0`.
 */
export const Rain = ({
  drops = 1,
  glow = 1,
  scale = 1,
  fade = 0,
  palette = DEFAULT_PALETTE,
  matrix = "blue-noise",
  stillTime = 9,
  ...props
}: RainProps) => {
  const wetness = clamp(drops, 0, 2);
  const brightness = clamp(glow, 0, 2);
  const size = clamp(scale, 0.4, 3);
  const clear = clamp(fade, 0, 1);
  return (
    <DitherShader
      {...props}
      field={FIELD}
      colorField={COLOR_FIELD}
      palette={palette}
      matrix={matrix}
      stillTime={stillTime}
      uniforms={{
        rainDrops: wetness,
        rainFade: clear,
        rainGlow: brightness,
        rainInks: palette.length - 1,
        rainScale: size,
        rainSlide: Math.min(1, 0.55 * wetness),
      }}
      fallback={
        <RainFallback
          palette={palette}
          drops={wetness}
          glow={brightness}
          scale={size}
          fade={clear}
          cell={props.cell}
        />
      }
    />
  );
};
