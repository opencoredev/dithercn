"use client";

import { useEffect, useRef } from "react";

import { maskForLevel } from "@/components/bayer-ramp";
import { cn } from "@/lib/utils";

/**
 * Site illustration, not a registry piece: a slow aurora over a planet's
 * horizon, ordered-dithered with the same 4x4 Bayer matrix as <BayerRamp />.
 *
 * The static CSS version below paints first and stays for anyone without
 * WebGL. The canvas renders one pixel per dither cell, scales up with
 * `image-rendering: pixelated`, and fades in over the CSS version once its
 * first frame is drawn.
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
  const images = `${maskForLevel(level)}, ${ring}`;
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

const VERTEX_SHADER = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uInk;
uniform vec3 uPaper;

const vec2 PLANET_CENTRE = vec2(${PLANET.cx.toFixed(3)}, ${(1 - PLANET.cy).toFixed(3)});
const vec2 PLANET_RADIUS = vec2(${PLANET.rx.toFixed(3)}, ${PLANET.ry.toFixed(3)});

// 4x4 Bayer threshold in [0, 1): the same matrix as BAYER_4.
float bayer2(vec2 a) {
  a = floor(a);
  return fract(dot(a, vec2(0.5, a.y * 0.75)));
}

float bayer4(vec2 a) {
  a = mod(a, 4.0);
  return bayer2(0.5 * a) * 0.25 + bayer2(a);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    amp *= 0.5;
  }
  return sum / 0.875;
}

void main() {
  vec2 cell = gl_FragCoord.xy;
  vec2 p = cell / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 world = vec2(p.x * aspect, p.y);
  float t = uTime;

  // Domain-warped noise, drifting slowly sideways along the horizon.
  vec2 warp = vec2(
    fbm(world * 1.3 + vec2(t * 0.021, 0.0)),
    fbm(world * 1.3 + vec2(5.2, 1.3) - vec2(0.0, t * 0.017))
  );
  float n = fbm(world * vec2(1.1, 2.6) + 1.7 * warp + vec2(t * 0.013, 0.0));

  // Signed distance from the horizon, in planet radii.
  float e = length((p - PLANET_CENTRE) / PLANET_RADIUS) - 1.0;

  float above = max(e, 0.0);
  float below = max(-e, 0.0);

  // Aurora curtains: noise stretched vertically, sliding along the horizon.
  // It thins out fast, so the upper half stays clear for the headline.
  float curtains = fbm(vec2(world.x * 5.0 + 2.0 * warp.x - t * 0.03, above * 1.5 - t * 0.01));
  float lit = 0.35 + 0.9 * n * curtains + 0.25 * n;
  float glow = exp(-above * 10.0) * lit + 0.22 * exp(-above * 5.5) * curtains * curtains;
  // A lit rim just inside the edge, then the dark planet.
  float rim = exp(-below * 34.0) * (0.85 + 0.4 * n);
  float tone = e > 0.0 ? glow : rim;

  // A few fixed stars in the dark sky, kept off the headline column. They
  // never move or blink.
  vec2 starCell = floor(cell);
  float starSeed = hash(vec2(hash(starCell), hash(starCell.yx + 31.7)) * 97.0);
  float star = step(0.9988, starSeed) * step(0.3, above) * step(0.22, abs(p.x - 0.5));
  tone = max(tone, star);

  // Snap to one of BayerRamp's 17 levels; a cell is inked when its
  // threshold is below the level, exactly as in maskForLevel.
  float level = floor(clamp(tone, 0.0, 1.0) * 16.0 + 0.5);
  float ink = step(bayer4(cell) * 16.0 + 0.5, level);
  gl_FragColor = vec4(mix(uPaper, uInk, ink), 1.0);
}
`;

type Rgb = readonly [number, number, number];

interface Renderer {
  draw: (input: {
    height: number;
    ink: Rgb;
    paper: Rgb;
    time: number;
    width: number;
  }) => void;
}

const compile = (
  gl: WebGLRenderingContext,
  type: GLenum,
  source: string
): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const createRenderer = (gl: WebGLRenderingContext): Renderer | null => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) {
    return null;
  }
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return null;
  }
  gl.useProgram(program);

  // One triangle that covers the whole viewport.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uResolution = gl.getUniformLocation(program, "uResolution");
  const uTime = gl.getUniformLocation(program, "uTime");
  const uInk = gl.getUniformLocation(program, "uInk");
  const uPaper = gl.getUniformLocation(program, "uPaper");

  return {
    draw: ({ height, ink, paper, time, width }) => {
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uResolution, width, height);
      gl.uniform1f(uTime, time);
      gl.uniform3f(uInk, ink[0], ink[1], ink[2]);
      gl.uniform3f(uPaper, paper[0], paper[1], paper[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
};

/**
 * Resolve a CSS colour (often oklch) to sRGB in [0, 1] by painting it into a
 * 1x1 canvas and reading the pixel back.
 */
const resolveColour = (
  root: HTMLElement,
  probe: CanvasRenderingContext2D,
  variable: string
): Rgb => {
  const span = document.createElement("span");
  span.style.color = `var(${variable})`;
  span.style.display = "none";
  root.append(span);
  const { color } = getComputedStyle(span);
  span.remove();
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = probe.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
};

type HeroState = "fallback" | "paused" | "running" | "static";

// The drift reads as slow at 30fps and costs half the frames.
const FRAME_INTERVAL = 1000 / 30;
// Reduced motion shows this moment of the animation, held still.
const STILL_TIME = 14;

/** Starts the canvas; returns its cleanup, or nothing when WebGL is missing. */
const startDitherHero = (
  root: HTMLElement,
  canvas: HTMLCanvasElement
): (() => void) | undefined => {
  const setState = (state: HeroState) => {
    root.dataset.state = state;
  };

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: "low-power",
    stencil: false,
  });
  const probe = document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true });
  if (!gl || !probe) {
    setState("fallback");
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let renderer = createRenderer(gl);
  let ink: Rgb = [0, 0, 0];
  let paper: Rgb = [0, 0, 0];
  let width = 0;
  let height = 0;
  let isOnScreen = true;
  let hasDrawn = false;
  let frame = 0;
  let elapsed = 0;
  let lastTick = 0;
  let lastDraw = 0;

  const readColours = () => {
    ink = resolveColour(root, probe, "--dither-ink");
    paper = resolveColour(root, probe, "--dither-paper");
  };

  const draw = (time: number) => {
    if (!renderer || width === 0 || height === 0) {
      return;
    }
    renderer.draw({ height, ink, paper, time, width });
    hasDrawn = true;
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    // Clamp the step so a long pause never jumps the drift forward.
    elapsed += Math.min(now - lastTick, 100) / 1000;
    lastTick = now;
    if (now - lastDraw >= FRAME_INTERVAL) {
      lastDraw = now;
      draw(elapsed);
    }
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const update = () => {
    if (!renderer) {
      stop();
      setState("fallback");
      return;
    }
    if (reducedMotion.matches) {
      stop();
      draw(STILL_TIME);
      setState(hasDrawn ? "static" : "fallback");
      return;
    }
    if (!hasDrawn) {
      draw(elapsed);
    }
    if (isOnScreen && document.visibilityState === "visible") {
      if (frame === 0) {
        lastTick = performance.now();
        frame = requestAnimationFrame(tick);
      }
      setState(hasDrawn ? "running" : "fallback");
    } else {
      stop();
      setState(hasDrawn ? "paused" : "fallback");
    }
  };

  // Redraw at once after a size or colour change, even while paused.
  const redraw = () => {
    draw(reducedMotion.matches ? STILL_TIME : elapsed);
    update();
  };

  const resize = () => {
    const cell =
      Number.parseFloat(
        getComputedStyle(root).getPropertyValue("--dither-cell")
      ) || 3;
    const rect = root.getBoundingClientRect();
    width = Math.max(1, Math.ceil(rect.width / cell));
    height = Math.max(1, Math.ceil(rect.height / cell));
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width * cell}px`;
    canvas.style.height = `${height * cell}px`;
    redraw();
  };

  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    isOnScreen = entry?.isIntersecting ?? true;
    update();
  });
  // Site theme changes can remap --dither-ink and --dither-paper.
  const themeObserver = new MutationObserver(() => {
    readColours();
    redraw();
  });

  const onContextLost = (event: Event) => {
    event.preventDefault();
    renderer = null;
    hasDrawn = false;
    update();
  };
  const onContextRestored = () => {
    renderer = createRenderer(gl);
    redraw();
  };

  readColours();
  resizeObserver.observe(root);
  intersectionObserver.observe(root);
  themeObserver.observe(document.documentElement, {
    attributeFilter: ["class", "style"],
    attributes: true,
  });
  document.addEventListener("visibilitychange", update);
  reducedMotion.addEventListener("change", redraw);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  return () => {
    stop();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    themeObserver.disconnect();
    document.removeEventListener("visibilitychange", update);
    reducedMotion.removeEventListener("change", redraw);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    canvas.removeEventListener("webglcontextrestored", onContextRestored);
  };
};

export const DitherHero = ({ className }: { className?: string }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) {
      return;
    }
    return startDitherHero(root, canvas);
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-state="fallback"
      className={cn(
        "dither-hero pointer-events-none absolute inset-0",
        className
      )}
    >
      {RINGS.map((ring) => (
        <div
          key={ring.from}
          className="bg-dither-ink absolute inset-0"
          style={ringStyle(ring)}
        />
      ))}
      <canvas ref={canvasRef} className="absolute top-0 left-0" />
    </div>
  );
};
