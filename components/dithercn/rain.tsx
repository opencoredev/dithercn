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
// The city behind the glass: soft discs of out-of-focus light, at most one
// per grid square, and a sprinkle of smaller, more distant ones. Returns the
// light's tone and which ink it is, 0 to 1. dice is a fixed random value per
// cell: where two lights meet, it mixes their colours as dots.
vec2 rainLights(vec2 p, float t, float dice) {
  vec2 q = p * rainScale / 0.24;
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
      vec2 sway = 0.07 * vec2(sin(t * 0.06 + seed * 40.0), cos(t * 0.045 + jitter.x * 30.0));
      vec2 centre = sq + 0.2 + 0.6 * jitter + sway;
      float radius = 0.24 + 0.32 * hash21(sq + vec2(5.5, 2.7));
      float d = length(q - centre) / radius;
      float lit = step(seed, 0.72) * (0.4 + 0.6 * hash21(sq + vec2(2.2, 6.6)));
      lit *= 0.9 + 0.1 * sin(t * 0.3 + seed * 50.0);
      // Lens blur: an even disc with a brighter rim and a soft edge.
      float disc = 1.0 - smoothstep(0.84, 1.0, d);
      sum += disc * (0.75 + 0.45 * smoothstep(0.6, 0.96, d)) * lit;
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
  vec2 f = q * 2.6 + vec2(17.0, 5.0);
  vec2 fine = floor(f);
  vec2 fineCentre = fine + 0.3 + 0.4 * vec2(hash21(fine + 8.8), hash21(fine + 2.9));
  float fd = length(f - fineCentre) / (0.13 + 0.08 * hash21(fine + 6.1));
  float pin = step(hash21(fine + 3.3), 0.16) * (1.0 - smoothstep(0.7, 1.0, fd));
  if (pin > 0.5 && sum < 0.4) {
    pick = hash21(fine + 4.4);
  }
  sum = sum * 0.34 + pin * 0.4;
  // The sky is darker than the street, and a faint haze hangs over the street.
  sum *= mix(0.4, 1.0, 1.0 - smoothstep(0.2, 1.0, p.y));
  sum += 0.04 * (1.0 - smoothstep(0.0, 0.6, p.y));
  return vec2(sum * rainGlow, pick);
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
  return x0 + 1.8 * sin(y / 31.0 + seed * 6.2831853) + 0.8 * sin(y / 9.7 + seed * 19.0);
}

// The big drop of one lane, in cells. Each life it lands at y0, gathers water
// for a moment, then slides down in short runs with pauses between, and a
// new one lands once it is long gone. Returns its centre (xy), radius (z, 0
// for none) and how fast it is running (w, 0 to 1). path holds the lane's
// x0, y0 and seed, to draw its trail, and how much of the trail is left as
// the life ends.
vec4 rainSlider(float cx, float rows, float t, float shift, float salt, out vec4 path) {
  float laneWidth = 48.0;
  float lane = floor((cx + shift) / laneWidth);
  float laneSeed = hash21(vec2(lane, salt));
  float stepCells = 15.0 + 12.0 * hash21(vec2(salt, lane + 3.1));
  float stepTime = 0.75 + 0.6 * hash21(vec2(lane + 7.7, salt));
  float lifeTime = 4.6 + (rows * 1.2 + 60.0) / stepCells * stepTime * (1.0 + 0.5 * laneSeed);
  float phase = t / lifeTime + laneSeed * 7.0;
  float age = fract(phase) * lifeTime;
  vec2 id = vec2(lane, floor(phase));
  float seed = hash21(id + vec2(salt, 1.7));
  float present = step(hash21(id + vec2(3.9, salt)), rainSlide);
  float radius = mix(6.0, 9.0, hash21(id + vec2(salt, 8.3))) * present;
  float y0 = rows * mix(0.35, 1.15, hash21(id + vec2(6.1, salt)));
  float hold = 0.6 + 3.4 * hash21(id + vec2(salt, 4.4));

  // Steps of uneven length: each stop sits up to a third of a step off the
  // even spacing, and each run takes its own share of the step's time.
  float s = max(age - hold, 0.0) / stepTime;
  float k = floor(s);
  float f = s - k;
  float from = k + 0.7 * (hash21(vec2(k, seed * 91.0)) - 0.5) * step(0.5, k);
  float to = k + 1.0 + 0.7 * (hash21(vec2(k + 1.0, seed * 91.0)) - 0.5);
  float runShare = mix(0.16, 0.38, hash21(vec2(k, seed * 53.0)));
  float run = min(f / runShare, 1.0);
  float eased = 1.0 - (1.0 - run) * (1.0 - run);
  float y = y0 - mix(from, to, eased) * stepCells;
  float moving = step(hold, age) * (1.0 - run) * smoothstep(0.0, 0.04, f);

  float x0 = (lane + 0.3 + 0.4 * hash21(id + vec2(salt, 2.2))) * laneWidth - shift;
  path = vec4(x0, y0, seed, 1.0 - smoothstep(lifeTime - 2.5, lifeTime, age));
  // It swells as it gathers water, before the first run.
  return vec4(rainPathX(y, x0, seed), y, radius * smoothstep(0.0, 0.8, age), moving);
}

// How fresh the trail is at height y, 1 just behind the drop and 0 long dry.
float rainTrailFade(float y, vec4 drop, vec4 path) {
  float behind = y - drop.y;
  return step(0.0, behind) * step(y, path.y) * exp(-behind / 70.0) * step(0.5, drop.z) * path.w;
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

// The wet line a drop leaves, and the droplets left along it.
float rainTrailLine(vec2 c, vec4 drop, vec4 path, out vec4 bead) {
  float fade = rainTrailFade(c.y, drop, path);
  float x = rainPathX(c.y, path.x, path.z);
  float halfWidth = max(0.7, 0.28 * drop.z);
  float line = 1.0 - smoothstep(halfWidth - 0.5, halfWidth + 0.5, abs(c.x - x));
  float slot = floor(c.y / 9.0);
  float by = (slot + 0.3 + 0.4 * hash21(vec2(slot, path.z * 37.0))) * 9.0;
  float br = mix(1.2, 2.2, hash21(vec2(path.z * 11.0, slot)));
  float kept = step(hash21(vec2(slot, path.z * 71.0)), 0.5) * step(0.05, rainTrailFade(by, drop, path));
  bead = vec4((c - vec2(rainPathX(by, path.x, path.z), by)) / br, br * kept, 0.0);
  return line * fade * step(0.03, fade);
}

// The offset from a sliding drop's centre in radii. Running drops stretch
// upwards into a short tail; resting ones sit a little flat at the bottom.
vec2 rainSliderOffset(vec2 c, vec4 drop) {
  vec2 o = c - drop.xy;
  o.y *= o.y > 0.0 ? 1.0 / (1.0 + 0.8 * drop.w) : 1.12;
  return o / max(drop.z, 1e-3);
}

// A drop is a tiny lens: it shows the lights behind brighter than the glass
// around it. Its edge catches the light as a thin ring, faint along the top
// and bright along the bottom, where the drop gathers the light into a
// crescent. Once it is big enough it also catches a glint at the top left.
float rainDropTone(vec2 off, float r, float light) {
  float d = length(off);
  // The ring is about a cell wide, whatever the drop's size.
  float ring = 1.0 - smoothstep(0.6, 1.4, (1.0 - d) * r);
  float below = 1.0 - smoothstep(-0.6, 0.2, off.y / max(d, 1e-3));
  float body = mix(0.14, 0.26, smoothstep(3.0, 7.0, r)) + 1.8 * light;
  float rim = ring * mix(0.4 + light, 1.0, below);
  float glint = 1.0 - smoothstep(0.0, max(0.24, 0.8 / r), length(off - vec2(-0.36, 0.38)));
  return max(max(body, rim), glint * smoothstep(1.8, 3.0, r));
}

// The whole scene: x is the tone, y which ink colours it.
vec2 rainScene(vec2 uv, vec2 res, float t) {
  vec2 c = uv * res;
  vec2 p = c / res.y;
  float clear = rainClear(uv);

  vec4 pathA;
  vec4 pathB;
  vec4 dropA = rainSlider(c.x, res.y, t, 0.0, 1.3, pathA);
  vec4 dropB = rainSlider(c.x, res.y, t, 24.0, 7.9, pathB);

  // The pixel is either in a sliding drop, in a bead, or on bare glass;
  // drops and beads look at the lights through a lens.
  float inDrop = 0.0;
  vec2 off = vec2(0.0);
  float radius = 0.0;
  float reach = 0.0;
  float dropClear = 1.0;
  vec2 offA = rainSliderOffset(c, dropA);
  vec2 offB = rainSliderOffset(c, dropB);
  if (dropA.z > 0.5 && length(offA) < 1.0) {
    inDrop = 1.0;
    off = offA;
    radius = dropA.z;
    reach = 0.22;
    dropClear = rainClear(dropA.xy / res);
  } else if (dropB.z > 0.5 && length(offB) < 1.0) {
    inDrop = 1.0;
    off = offB;
    radius = dropB.z;
    reach = 0.22;
    dropClear = rainClear(dropB.xy / res);
  }

  vec4 trailBeadA;
  vec4 trailBeadB;
  float trail = max(rainTrailLine(c, dropA, pathA, trailBeadA), rainTrailLine(c, dropB, pathB, trailBeadB));
  // Droplets along a trail clear with the rest where the glass is wiped.
  trailBeadA.z *= step(0.6, clear);
  trailBeadB.z *= step(0.6, clear);

  if (inDrop < 0.5) {
    float chance = clear * rainDrops;
    vec4 still = rainBead(c, 11.0, 1.8, 4.2, 2.7, 0.42 * chance, t, 0.0);
    vec4 landed = rainBead(c + vec2(6.0, 8.0), 16.0, 2.2, 5.0, 5.3, 0.3 * chance, t, 26.0);
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
          reach = 0.12;
        }
      }
    }
  }

  // One look at the lights: through the lens, flipped and shrunk, or straight.
  vec2 q = inDrop > 0.5 ? (c - off * radius) / res.y - off * reach : p;
  vec2 light = rainLights(q, t, hash21(floor(c) + vec2(3.7, 9.2)));
  light.x *= mix(0.22, 1.0, clear);
  if (inDrop > 0.5) {
    return vec2(rainDropTone(off, radius, light.x) * dropClear, light.y);
  }
  // A trail is a clean streak: the light behind shows a little clearer on it.
  float wet = trail * (0.5 + light.x) * clear;
  return vec2(max(light.x, light.x * 0.6 + wet), light.y);
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

/** The lights as the shader lays them out: one per grid square at most. */
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
  const square = (box.height * 0.24) / scale;
  const columns = Math.ceil(box.width / square);
  const rows = Math.ceil(box.height / square);
  // Dimmer high up, as in the shader's sky.
  const sky = (y: number) => {
    const up = 1 - y / box.height;
    const t = clamp((up - 0.2) / 0.8, 0, 1);
    return 0.4 + 0.6 * (1 - t * t * (3 - 2 * t));
  };
  const lights: Light[] = [];
  for (let gy = -1; gy <= rows; gy += 1) {
    for (let gx = -1; gx <= columns; gx += 1) {
      if (fallbackHash(gx, gy, 1) < 0.72) {
        const x = (gx + 0.2 + 0.6 * fallbackHash(gx, gy, 2)) * square;
        const y =
          box.height - (gy + 0.2 + 0.6 * fallbackHash(gx, gy, 3)) * square;
        lights.push({
          ink: Math.floor(fallbackHash(gx, gy, 5) * inks),
          r: (0.24 + 0.32 * fallbackHash(gx, gy, 4)) * square,
          tone: 0.34 * (0.4 + 0.6 * fallbackHash(gx, gy, 6)) * sky(y) * glow,
          x,
          y,
        });
      }
    }
  }
  // The smaller, more distant lights.
  const fine = square / 2.6;
  for (let gy = 0; gy <= rows * 2.6; gy += 1) {
    for (let gx = 0; gx <= columns * 2.6; gx += 1) {
      if (fallbackHash(gx, gy, 7) < 0.16) {
        const x = (gx + 0.3 + 0.4 * fallbackHash(gx, gy, 8)) * fine;
        const y =
          box.height - (gy + 0.3 + 0.4 * fallbackHash(gx, gy, 9)) * fine;
        lights.push({
          ink: Math.floor(fallbackHash(gx, gy, 10) * inks),
          r: (0.13 + 0.08 * fallbackHash(gx, gy, 11)) * fine,
          tone: 0.4 * sky(y) * glow,
          x,
          y,
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
    if (d < 1) {
      tone += light.tone;
    }
    const weight = light.tone * Math.exp(-d * d * 1.5);
    if (weight > best) {
      best = weight;
      ({ ink } = light);
    }
  }
  return { ink, tone };
};

/** A drop sliding down the glass in the still frame, with its trail above it. */
interface Slider {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** Where its trail starts, above the drop. */
  readonly top: number;
}

/** A still bead on the glass. */
interface Bead {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

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
  const lane = 48 * cell;
  const sliders: Slider[] = [];
  for (const [shift, salt] of [
    [0, 20],
    [24, 40],
  ] as const) {
    for (let index = -1; index * lane < box.width + lane; index += 1) {
      if (fallbackHash(index, salt, 1) < 0.85 * drops) {
        const y = box.height * (0.25 + 0.7 * fallbackHash(index, salt, 3));
        sliders.push({
          r: (6 + 3 * fallbackHash(index, salt, 2)) * cell,
          top: y - box.height * (0.12 + 0.45 * fallbackHash(index, salt, 4)),
          x:
            (index + 0.3 + 0.4 * fallbackHash(index, salt, 5)) * lane -
            shift * cell,
          y,
        });
      }
    }
  }
  const wiped = (x: number, y: number, r: number) =>
    sliders.some(
      (slider) =>
        Math.abs(x - slider.x) < slider.r + r &&
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
    for (let gy = 0; gy * square < box.height; gy += 1) {
      for (let gx = 0; gx * square < box.width; gx += 1) {
        if (fallbackHash(gx, gy, salt) < chance) {
          const x = (gx + fallbackHash(gx, gy, salt + 1)) * square;
          const y = (gy + fallbackHash(gx, gy, salt + 2)) * square;
          const r =
            (rMin + (rMax - rMin) * fallbackHash(gx, gy, salt + 3) ** 2) * cell;
          if (!wiped(x, y, r)) {
            beads.push({ r, x, y });
          }
        }
      }
    }
  };
  grid({ chance: 0.42 * drops, rMax: 4.2, rMin: 1.8, salt: 60, size: 11 });
  grid({ chance: 0.3 * drops, rMax: 5, rMin: 2.2, salt: 70, size: 16 });
  return { beads, sliders };
};

/** A tone as an opacity in tenths, so drops of one colour share a path. */
const bucket = (tone: number) => Math.round(clamp(tone, 0, 1) * 10) / 10;

const num = (value: number) => value.toFixed(1);

/** Circles as one path, so hundreds of beads cost a few elements. */
const circles = (list: readonly Bead[]) =>
  list
    .map(
      ({ x, y, r }) =>
        `M${num(x - r)} ${num(y)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0`
    )
    .join("");

/** The bright crescent along the bottom of each drop, as one path. */
const crescents = (list: readonly Bead[], inset: number) =>
  list
    .map(({ x, y, r }) => {
      const radius = Math.max(0.5, r - inset);
      const dx = radius * 0.87;
      const dy = radius * 0.5;
      return `M${num(x - dx)} ${num(y + dy)}A${num(radius)} ${num(radius)} 0 0 0 ${num(x + dx)} ${num(y + dy)}`;
    })
    .join("");

/** The glint at the top left of each drop big enough to catch one. */
const glints = (list: readonly Bead[], cell: number) =>
  circles(
    list
      .filter(({ r }) => r > 2.2 * cell)
      .map(({ x, y, r }) => ({
        r: Math.max(0.6 * cell, 0.24 * r),
        x: x - 0.36 * r,
        y: y - 0.38 * r,
      }))
  );

/**
 * A still SVG of the same window, shown without WebGL: blurred discs of
 * light behind the glass, beads that take the colour of the light behind
 * them, and a few big drops with the wet trails they left.
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
  const ditherCell = cell ?? inherited;
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
  // Drops grouped by colour and brightness, a few paths each. The big
  // drops are thicker lenses, so they start a little brighter.
  const groups = useMemo(() => {
    const byKey = new Map<
      string,
      { ink: number; tone: number; beads: Bead[] }
    >();
    const add = (bead: Bead, base: number) => {
      const seen = lightAt(lights, bead.x, bead.y);
      const tone = bucket(base + 1.8 * seen.tone);
      const key = `${seen.ink}-${tone}`;
      const group = byKey.get(key) ?? { beads: [], ink: seen.ink, tone };
      group.beads.push(bead);
      byKey.set(key, group);
    };
    for (const bead of scene.beads) {
      add(bead, 0.14);
    }
    for (const slider of scene.sliders) {
      add(slider, 0.26);
    }
    return [...byKey.values()];
  }, [lights, scene]);
  const ink = (index: number) => inks[index] ?? inks[0] ?? paper;
  const square = (box.height * 0.24) / scale;
  const mask =
    fade > 0
      ? `radial-gradient(50% 41.7% at 50% 50%, rgb(0 0 0 / ${(1 - fade).toFixed(2)}) 55%, #000 135%)`
      : undefined;
  const dim =
    fade > 0
      ? `radial-gradient(50% 41.7% at 50% 50%, rgb(0 0 0 / ${(1 - 0.78 * fade).toFixed(2)}) 55%, #000 135%)`
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
        style={{ maskImage: dim }}
      >
        <defs>
          <filter
            id={`${id}-blur`}
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
          >
            <feGaussianBlur stdDeviation={(0.05 * square).toFixed(1)} />
          </filter>
          <linearGradient id={`${id}-haze`} x1="0" x2="0" y1="1" y2="0">
            <stop
              offset="0"
              stopColor={ink(0)}
              stopOpacity={(0.08 * glow).toFixed(2)}
            />
            <stop offset="0.7" stopColor={ink(0)} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width={box.width} height={box.height} fill={`url(#${id}-haze)`} />
        <g filter={`url(#${id}-blur)`}>
          {lights.map((light) => (
            <circle
              key={`${light.x.toFixed(1)}-${light.y.toFixed(1)}`}
              cx={light.x.toFixed(1)}
              cy={light.y.toFixed(1)}
              r={light.r.toFixed(1)}
              fill={ink(light.ink)}
              fillOpacity={clamp(light.tone, 0, 1).toFixed(2)}
              stroke={ink(light.ink)}
              strokeOpacity={clamp(light.tone * 0.4, 0, 1).toFixed(2)}
              strokeWidth={(light.r * 0.12).toFixed(1)}
            />
          ))}
        </g>
      </svg>
      <svg
        aria-hidden="true"
        className="absolute inset-0 size-full"
        viewBox={`0 0 ${box.width} ${box.height}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ maskImage: mask }}
      >
        <defs>
          {inks.map((color, index) => (
            <linearGradient
              key={`trail-${index}`}
              id={`${id}-trail-${index}`}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="0" stopColor={color} stopOpacity="0" />
              <stop offset="1" stopColor={color} stopOpacity="0.5" />
            </linearGradient>
          ))}
        </defs>
        {scene.sliders.map((slider) => {
          const width = Math.max(1.4 * ditherCell, 0.56 * slider.r);
          return (
            <rect
              key={`${num(slider.x)}-${num(slider.y)}`}
              x={num(slider.x - width / 2)}
              y={num(slider.top)}
              width={num(width)}
              height={num(Math.max(0, slider.y - slider.top))}
              fill={`url(#${id}-trail-${lightAt(lights, slider.x, slider.y).ink})`}
            />
          );
        })}
        {groups.map((group) => (
          <g key={`${group.ink}-${group.tone}`} fill={ink(group.ink)}>
            <path d={circles(group.beads)} fillOpacity={group.tone} />
            <path
              d={circles(group.beads)}
              fill="none"
              stroke={ink(group.ink)}
              strokeOpacity={clamp(group.tone + 0.25, 0, 1).toFixed(2)}
              strokeWidth={num(ditherCell * 0.8)}
            />
            <path
              d={crescents(group.beads, ditherCell * 0.5)}
              fill="none"
              stroke={ink(group.ink)}
              strokeWidth={num(ditherCell * 1.1)}
              strokeLinecap="round"
            />
            <path d={glints(group.beads, ditherCell)} />
          </g>
        ))}
      </svg>
    </div>
  );
};

/**
 * Rain on a window at night, drawn as a dither: the city behind the glass
 * is a few soft discs of out-of-focus light, and the glass in front is
 * beaded with drops that show those lights brighter, like tiny lenses.
 * Bigger drops slide down in short jerky runs and leave wet trails that
 * wipe the beads off their path. Decorative and full-bleed: size it with
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
        rainSlide: Math.min(1, 0.85 * wetness),
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
