"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { cssColor, DitherShader, usePrefersReducedMotion } from "@/lib/dither";
import type {
  DitherColor,
  DitherPalette,
  DitherShaderProps,
} from "@/lib/dither";
import { cn } from "@/lib/utils";

export type DitherOrbProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback" | "palette"
> & {
  /** Colour of the orb. Default `"ink"`. */
  color?: DitherColor;
  /** A third, brighter tone for the specular highlight, such as `"#fff"`. Default: none, the highlight stays in `color`. */
  highlight?: DitherColor;
  /** Colour behind the orb. `"transparent"` floats it over the page. Default `"--dither-paper"`. */
  background?: DitherColor;
  /** Radius as a share of the box's shorter side, 0.1 to 0.5. Default 0.26. */
  size?: number;
  /** How much the outline wobbles, 0 for a perfect sphere. Default 1. */
  morph?: number;
  /** How far the orb and its light lean towards the pointer, 0 to turn it off. Default 1. */
  lean?: number;
  /** Strength of the dithered glow around the orb, 0 to 1. Default 0.5. */
  glow?: number;
};

const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  float fit = min(aspect, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 2.0 / fit;
  vec2 q = p - orbLean * 0.16;
  float r = length(q);
  float a = atan(q.y, q.x);

  // A slowly breathing outline: two low harmonics plus soft noise.
  float wobble = 0.045 * sin(3.0 * a + t * 0.6)
    + 0.03 * sin(5.0 * a - t * 0.8 + 1.3)
    + 0.05 * snoise(q * 1.2 + vec2(t * 0.12, -t * 0.09));
  float radius = orbSize * 2.0 * (1.0 + orbMorph * wobble);
  float d = r / radius;

  vec3 light = normalize(vec3(-0.5 + orbLean.x * 0.35, 0.55 + orbLean.y * 0.35, 0.8));
  if (d < 1.0) {
    vec3 n = vec3(q / radius, sqrt(1.0 - d * d));
    float diffuse = max(dot(n, light), 0.0);
    float spec = pow(max(dot(reflect(-light, n), vec3(0.0, 0.0, 1.0)), 0.0), 60.0);
    float rim = pow(1.0 - n.z, 3.0);
    // Faint currents inside the orb so the surface never looks flat.
    float swirl = fbm(n.xy * 1.8 + vec2(t * 0.05, t * 0.03)) - 0.5;
    // Ambient keeps the shadow side readable; a thin rim light outlines it.
    float body = 0.09 + 0.82 * pow(diffuse, 1.4) + 0.28 * rim + 0.14 * swirl * diffuse;
    return clamp(body * orbBody + spec * 0.8, 0.0, 1.0);
  }
  // Outside: a glow that falls off with distance, brighter on the lit side.
  float side = 0.25 + 0.75 * smoothstep(-0.2, 1.0, dot(normalize(q), normalize(light.xy)));
  return orbGlow * 0.4 * exp(-(d - 1.0) * 7.0) * side;
}
`;

const clampUnit = (value: number) => Math.max(-1, Math.min(1, value));

/**
 * The pointer's position relative to the element, eased: each axis -1 to 1.
 * Stays at the centre under reduced motion or when `enabled` is false.
 */
const useEasedPointer = (
  target: RefObject<HTMLDivElement | null>,
  enabled: boolean
) => {
  const [lean, setLean] = useState<readonly [number, number]>([0, 0]);
  useEffect(() => {
    if (!enabled) {
      setLean([0, 0]);
      return;
    }
    let goal: [number, number] = [0, 0];
    let current: [number, number] = [0, 0];
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const ease = 1 - Math.exp(-((now - last) / 1000) * 3.5);
      last = now;
      current = [
        current[0] + (goal[0] - current[0]) * ease,
        current[1] + (goal[1] - current[1]) * ease,
      ];
      setLean(current);
      const settled =
        Math.abs(goal[0] - current[0]) + Math.abs(goal[1] - current[1]) < 0.002;
      frame = settled ? 0 : requestAnimationFrame(step);
    };
    const onMove = (event: PointerEvent) => {
      const box = target.current?.getBoundingClientRect();
      if (!box || box.width === 0) {
        return;
      }
      goal = [
        clampUnit(((event.clientX - box.left) / box.width - 0.5) * 2),
        clampUnit(-((event.clientY - box.top) / box.height - 0.5) * 2),
      ];
      if (frame === 0) {
        last = performance.now();
        frame = requestAnimationFrame(step);
      }
    };
    const onLeave = () => {
      goal = [0, 0];
      if (frame === 0) {
        last = performance.now();
        frame = requestAnimationFrame(step);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [target, enabled]);
  return lean;
};

/**
 * A lit, dithered orb: a sphere whose outline breathes slowly, with a soft
 * terminator, a specular highlight and a dithered glow. The orb and its
 * light lean towards the pointer and ease back when it leaves. Static
 * under reduced motion. Decorative: size the box with `className`, usually
 * `absolute inset-0`; the orb stays round and centred.
 */
export const DitherOrb = ({
  color = "ink",
  highlight,
  background = "--dither-paper",
  size = 0.26,
  morph = 1,
  lean = 1,
  glow = 0.5,
  animate = true,
  className,
  style,
  ...props
}: DitherOrbProps) => {
  const root = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const pointer = useEasedPointer(root, animate && lean > 0 && !reducedMotion);
  const palette: DitherPalette = highlight
    ? [background, color, highlight]
    : [background, color];

  return (
    <div
      ref={root}
      aria-hidden
      className={cn("relative overflow-hidden", className)}
      style={style}
    >
      <DitherShader
        {...props}
        className="absolute inset-0"
        animate={animate}
        field={FIELD}
        palette={palette}
        uniforms={{
          // With a highlight, the body stays below the top tone.
          orbBody: highlight ? 0.55 : 1,
          orbGlow: Math.min(1, Math.max(0, glow)),
          orbLean: [pointer[0] * lean, pointer[1] * lean],
          orbMorph: Math.max(0, morph),
          orbSize: Math.min(0.5, Math.max(0.1, size)),
        }}
        fallback={
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: cssColor(background),
              // closest-side is half the shorter side, so the orb's radius is size * 200%.
              backgroundImage: `radial-gradient(circle closest-side at 50% 50%, ${cssColor(color)} 0%, transparent ${Math.round(Math.min(0.5, Math.max(0.1, size)) * 210)}%)`,
            }}
          />
        }
      />
    </div>
  );
};
