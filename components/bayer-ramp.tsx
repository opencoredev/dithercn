"use client";

import { useState } from "react";

import { DitherShader, ditherMaskStyle } from "@/lib/dither";
import type { DitherMatrix } from "@/lib/dither";
import { cn } from "@/lib/utils";

/**
 * Site illustration, not a registry piece: a live calibration strip. One
 * DitherShader draws a tone ramp from no ink on the left to solid on the
 * right, with a slow ripple so the thresholds visibly work. Switching the
 * matrix redraws the same ramp through a different threshold map.
 */

// `detail` drops on phones so all four fit on one row.
const MATRICES = [
  { detail: " Bayer", label: "2×2", value: "bayer2" },
  { detail: " Bayer", label: "4×4", value: "bayer4" },
  { detail: " Bayer", label: "8×8", value: "bayer8" },
  { detail: "", label: "Blue noise", value: "blue-noise" },
] as const satisfies readonly {
  detail: string;
  label: string;
  value: DitherMatrix;
}[];

type RampMatrix = (typeof MATRICES)[number]["value"];

const RAMP_FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float swell = 0.045 * snoise(vec2(uv.y * 1.4 + t * 0.06, uv.x * 2.2 - t * 0.05));
  return clamp(uv.x * 1.06 - 0.03 + swell, 0.0, 1.0);
}
`;

const TICKS = ["0%", "25%", "50%", "75%", "100%"] as const;

// Fallback without WebGL: five static steps of the same ramp.
const FALLBACK_STEPS = [0.0625, 0.25, 0.5, 0.75, 1] as const;

const Fallback = () => (
  <div className="absolute inset-0 grid grid-cols-5">
    {FALLBACK_STEPS.map((level) => (
      <div
        key={level}
        className="bg-dither-ink"
        style={ditherMaskStyle(level)}
      />
    ))}
  </div>
);

export const BayerRamp = ({ className }: { className?: string }) => {
  const [matrix, setMatrix] = useState<RampMatrix>("bayer4");

  return (
    <figure className={cn("flex flex-col gap-4", className)}>
      <div
        role="group"
        aria-label="Threshold matrix"
        className="bg-secondary grid w-full grid-cols-[1fr_1fr_1fr_auto] gap-0.5 rounded-full p-1 sm:flex sm:w-fit"
      >
        {MATRICES.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === matrix}
            onClick={() => setMatrix(option.value)}
            className="text-muted-foreground hover:text-foreground aria-pressed:bg-background aria-pressed:text-foreground focus-visible:ring-ring/50 h-8 shrink-0 rounded-full px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 outline-none focus-visible:ring-[3px] sm:px-3.5"
          >
            {option.label}
            {option.detail ? (
              <span className="max-sm:sr-only">{option.detail}</span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="relative h-44 overflow-hidden rounded-[20px] border sm:h-64 lg:h-80">
        <DitherShader
          field={RAMP_FIELD}
          matrix={matrix}
          cell={4}
          stillTime={6}
          fallback={<Fallback />}
          className="absolute inset-0"
        />
      </div>
      <div
        aria-hidden="true"
        className="text-muted-foreground flex justify-between font-mono text-xs tabular-nums"
      >
        {TICKS.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
      <figcaption className="text-muted-foreground max-w-2xl text-sm text-pretty">
        One field, a ramp from no ink to solid, drawn through the matrix you
        pick. Each matrix gives the same tones a different grain.
      </figcaption>
    </figure>
  );
};
