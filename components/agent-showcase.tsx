"use client";

import { ArrowUp02Icon } from "@hugeicons/core-free-icons";
import { Tabs as TabsPrimitive } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Icon } from "@/components/icon";
import {
  DitherShader,
  fillStyle,
  useDocumentVisible,
  useInView,
  usePrefersReducedMotion,
} from "@/lib/dither";
import type { DitherMatrix } from "@/lib/dither";
import { cn } from "@/lib/utils";

/**
 * Landing centrepiece: a sentence you might give your agent, sitting in a
 * composer on top of the dither it asks for. Each result is a short GLSL
 * field on the engine's DitherShader, written for this page, not an
 * installed example. When real agent runs replace them, `caption` carries
 * the credit ("Built by <model> from this sentence").
 *
 * The stage shows one result at a time, so the section holds one WebGL
 * context. Results advance on their own until the visitor picks one; the
 * timer pauses on hover, offscreen and in hidden tabs, and never runs under
 * reduced motion.
 */

// Where the mock content sits: horizontally centred, a little above the
// middle, clear of the composer. uv has y up.
const FOCUS = "vec2(0.5, 0.6)";

// A soft hole around the mock headline so it reads over the dither. Half
// extents in cells: wide on desktop, the full text column on phones.
const CLEAR = `
float showClear(vec2 uv, vec2 res) {
  vec2 extent = vec2(min(130.0, res.x * 0.46), 30.0);
  return smoothstep(0.0, 0.7, length((uv - ${FOCUS}) * res / extent) - 1.0);
}
`;

const TOPO_FIELD = `${CLEAR}
float showTopoHeight(vec2 p, float t) {
  vec2 drift = vec2(t * 0.025, t * 0.012);
  return 0.5 + 0.32 * snoise(p * 0.85 + drift) + 0.14 * snoise(p * 1.9 - drift * 1.4 + 3.1);
}

float field(vec2 uv, vec2 res, float t) {
  vec2 p = vec2(uv.x * res.x / res.y, uv.y) * 1.6;
  float e = 1.6 / res.y;
  float h = showTopoHeight(p, t);
  float hx = showTopoHeight(p + vec2(e, 0.0), t);
  float hy = showTopoHeight(p + vec2(0.0, e), t);
  float v = h * 12.0;
  float perCell = max(length(vec2(hx - h, hy - h)) * 12.0, 1e-4);
  float d = abs(fract(v + 0.5) - 0.5) / perCell;
  float line = 1.0 - smoothstep(0.3, 1.1, d);
  float major = 1.0 - step(0.5, mod(floor(v + 0.5), 4.0));
  return line * mix(0.5, 1.0, major) * showClear(uv, res);
}
`;

const METER_FIELD = `
float field(vec2 uv, vec2 res, float t) {
  vec2 c = (uv - ${FOCUS}) * vec2(res.x / res.y, 1.0);
  float r = length(c);
  float angle = fract(atan(c.x, c.y) / 6.2831853);
  float cellSize = 1.0 / res.y;
  float radius = 0.27;
  float band = 1.0 - smoothstep(0.0, 1.5 * cellSize, abs(r - radius) - 0.045);
  float value = showMeterValue * smoothstep(0.0, 1.0, min(t * 0.6, 1.0));
  float filled = step(angle, value);
  float along = angle / max(value, 0.001);
  float inner = smoothstep(radius - 0.05, radius + 0.05, r);
  float arc = mix(0.45, 1.0, along * along) * mix(0.75, 1.0, inner);
  return band * mix(0.12, arc, filled);
}
`;

const RIPPLE_FIELD = `${CLEAR}
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 drop = vec2(0.5 * aspect, 0.6);
  float wobble = fbm(p * 2.2 + vec2(t * 0.03, 0.0)) - 0.5;
  float d = length(p - drop) + wobble * 0.08;
  float rings = 0.5 + 0.5 * cos(d * 38.0 - t * 0.9);
  return 0.9 * rings * exp(-d * 1.6) * showClear(uv, res);
}
`;

/** Lines of GLSL in a field, counted the way a reader would. */
const lineCount = (glsl: string) =>
  glsl.split("\n").filter((line) => line.trim() !== "").length;

const techniqueCaption = (glsl: string) =>
  `A ${lineCount(glsl)}-line GLSL field on DitherShader, written for this page.`;

interface ShowcaseItem {
  id: string;
  /** Short name on the tab. */
  label: string;
  /** What you would type to your agent. */
  prompt: string;
  /** Who or what made the result. Technique only until real runs exist. */
  caption: string;
  field: string;
  matrix: DitherMatrix;
  uniforms?: Record<string, number>;
  /** Field seconds shown under reduced motion. */
  stillTime: number;
  /** The page content the dither sits behind. */
  scene: ReactNode;
}

const HEADLINE_CLS =
  "text-[2.5rem] leading-[1] font-medium tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl";

const SHOWCASE = [
  {
    caption: techniqueCaption(TOPO_FIELD),
    field: TOPO_FIELD,
    id: "contours",
    label: "Contours",
    matrix: "bayer4",
    prompt:
      "A dithered topographic background behind the hero. Slow, and quiet enough to read over.",
    scene: (
      <div className="flex max-w-3xl flex-col items-center gap-3 text-center">
        <p className={HEADLINE_CLS}>Field notes for the trail</p>
        <p className="text-muted-foreground text-base sm:text-lg">
          Maps, routes and the long way round.
        </p>
      </div>
    ),
    stillTime: 8,
  },
  {
    caption: techniqueCaption(METER_FIELD),
    field: METER_FIELD,
    id: "meter",
    label: "Usage meter",
    matrix: "bayer8",
    prompt:
      "A radial usage meter for the billing card. 72% used, with the number in the middle.",
    scene: (
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-6xl font-medium tracking-[-0.05em] tabular-nums sm:text-7xl">
          72%
        </p>
        <p className="text-muted-foreground text-sm sm:text-base">
          of storage used
        </p>
      </div>
    ),
    stillTime: 4,
    uniforms: { showMeterValue: 0.72 },
  },
  {
    caption: techniqueCaption(RIPPLE_FIELD),
    field: RIPPLE_FIELD,
    id: "ripples",
    label: "Ripples",
    matrix: "bayer8",
    prompt: "Ripples spreading out from behind the pricing headline.",
    scene: (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className={HEADLINE_CLS}>Simple pricing</p>
        <p className="text-muted-foreground text-base sm:text-lg">
          One plan, every component.
        </p>
      </div>
    ),
    stillTime: 4,
  },
] as const satisfies readonly [ShowcaseItem, ...ShowcaseItem[]];

type ShowcaseId = (typeof SHOWCASE)[number]["id"];

const isShowcaseId = (value: string): value is ShowcaseId =>
  SHOWCASE.some((item) => item.id === value);

const nextId = (id: ShowcaseId): ShowcaseId => {
  const index = SHOWCASE.findIndex((item) => item.id === id);
  return SHOWCASE[(index + 1) % SHOWCASE.length]?.id ?? SHOWCASE[0].id;
};

/** How long each result holds before the next, while auto-advancing. */
const HOLD_MS = 7000;

// The tab's progress line: a dithered ramp, densest at its moving end.
const PROGRESS_FILL = fillStyle("gradient", {
  cell: 2,
  edge: "right",
  length: 40,
});

/**
 * Fills from left to right over HOLD_MS, then calls `onDone`. Driven by
 * WAAPI so pausing freezes it in place rather than restarting it.
 */
const TabProgress = ({
  paused,
  onDone,
}: {
  paused: boolean;
  onDone: () => void;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const animation = useRef<Animation | null>(null);
  const done = useRef(onDone);

  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const run = node.animate(
      [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
      { duration: HOLD_MS, easing: "linear", fill: "forwards" }
    );
    run.addEventListener("finish", () => done.current());
    animation.current = run;
    return () => run.cancel();
  }, []);

  useEffect(() => {
    const run = animation.current;
    if (!run || run.playState === "finished") {
      return;
    }
    if (paused) {
      run.pause();
    } else {
      run.play();
    }
  }, [paused]);

  return (
    <span
      aria-hidden="true"
      className="absolute inset-x-3 bottom-1 h-0.5 overflow-hidden"
    >
      <span
        ref={ref}
        className="bg-dither-ink block size-full origin-left scale-x-0"
        style={PROGRESS_FILL}
      />
    </span>
  );
};

const Composer = ({ item }: { item: ShowcaseItem }) => (
  <div className="bg-background/85 relative flex w-full max-w-2xl items-end gap-3 rounded-[22px] border p-2 pl-5 backdrop-blur-md">
    <p className="animate-in fade-in slide-in-from-bottom-1 min-w-0 flex-1 self-center py-2 text-[0.95rem] leading-snug text-pretty duration-500 motion-reduce:animate-none sm:text-lg">
      {item.prompt}
    </p>
    <span
      aria-hidden="true"
      className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full"
    >
      <Icon icon={ArrowUp02Icon} className="size-4" />
    </span>
  </div>
);

const Stage = ({ item }: { item: ShowcaseItem }) => (
  <div className="bg-background relative isolate flex h-[560px] flex-col items-center overflow-hidden rounded-[24px] border px-4 pt-10 pb-5 sm:h-[600px] sm:px-8 sm:pb-8 lg:h-[640px]">
    <DitherShader
      field={item.field}
      matrix={item.matrix}
      uniforms={item.uniforms}
      stillTime={item.stillTime}
      className="absolute inset-0 -z-10"
    />
    <div className="animate-in fade-in flex w-full flex-1 items-center justify-center pb-6 duration-700 motion-reduce:animate-none">
      {item.scene}
    </div>
    <Composer item={item} />
  </div>
);

/** The stage plus its credit line, which sits outside the dither so it always reads. */
const Result = ({ item }: { item: ShowcaseItem }) => (
  <figure className="flex flex-col gap-3">
    <Stage item={item} />
    <figcaption className="text-muted-foreground px-1 text-sm">
      {item.caption}
    </figcaption>
  </figure>
);

export const AgentShowcase = ({ className }: { className?: string }) => {
  const [value, setValue] = useState<ShowcaseId>(SHOWCASE[0].id);
  const [userPicked, setUserPicked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { rootMargin: "0px" });
  const visible = useDocumentVisible();
  const reducedMotion = usePrefersReducedMotion();

  const autoAdvance = !userPicked && !reducedMotion;
  const paused = hovered || focused || !inView || !visible;

  return (
    <TabsPrimitive.Root
      ref={rootRef}
      value={value}
      onValueChange={(next) => {
        if (isShowcaseId(next)) {
          setValue(next);
          setUserPicked(true);
        }
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        // Stay paused while focus moves between tabs and the panel.
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
        }
      }}
      className={cn("flex flex-col gap-4", className)}
    >
      <TabsPrimitive.List
        aria-label="Requests to an agent"
        className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 py-1"
      >
        {SHOWCASE.map((entry) => (
          <TabsPrimitive.Trigger
            key={entry.id}
            value={entry.id}
            className="text-muted-foreground hover:text-foreground data-[state=active]:bg-secondary data-[state=active]:text-foreground focus-visible:ring-ring/50 relative h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-[3px]"
          >
            {entry.label}
            {autoAdvance && entry.id === value ? (
              <TabProgress
                key={entry.id}
                paused={paused}
                onDone={() => setValue(nextId(entry.id))}
              />
            ) : null}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {SHOWCASE.map((entry) => (
        <TabsPrimitive.Content
          key={entry.id}
          value={entry.id}
          className="focus-visible:ring-ring/50 rounded-[24px] outline-none focus-visible:ring-[3px]"
        >
          <Result item={entry} />
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
};
