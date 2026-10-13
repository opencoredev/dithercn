"use client";

import { useEffect, useRef, useState } from "react";

import { DitherShader } from "@/lib/dither";

// Slow drifting noise: two fbm layers moving against each other.
const DRIFT = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * 1.6;
  float n = fbm(p + vec2(t * 0.06, t * 0.02));
  float m = fbm(p * 1.7 - vec2(t * 0.03, 0.0) + n);
  return smoothstep(0.25, 0.85, m) * (0.35 + 0.65 * uv.y);
}
`;

/** Mirrors the shader's data-state attribute so the demo can show it. */
const useDitherState = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState("fallback");

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const read = () => setState(el.dataset.state ?? "fallback");
    read();
    const observer = new MutationObserver(read);
    observer.observe(el, { attributeFilter: ["data-state"], attributes: true });
    return () => observer.disconnect();
  }, []);

  return { ref, state };
};

export default function ConceptMotion() {
  const [animate, setAnimate] = useState(true);
  const { ref, state } = useDitherState();

  return (
    <div className="relative size-full">
      <DitherShader
        ref={ref}
        field={DRIFT}
        animate={animate}
        className="absolute inset-0"
      />
      <div className="bg-background/85 absolute inset-x-3 bottom-3 flex items-center justify-between gap-4 rounded-full py-1.5 pr-1.5 pl-4 backdrop-blur-sm sm:inset-x-auto sm:right-4 sm:bottom-4">
        <span className="text-muted-foreground text-sm">
          data-state <span className="text-foreground font-mono">{state}</span>
        </span>
        <button
          type="button"
          onClick={() => setAnimate((value) => !value)}
          aria-pressed={animate}
          className="bg-foreground text-background focus-visible:ring-ring/50 h-8 rounded-full px-3.5 text-sm font-medium transition-[scale] duration-150 outline-none focus-visible:ring-[3px] active:scale-[0.96]"
        >
          {animate ? "Pause" : "Play"}
        </button>
      </div>
    </div>
  );
}
