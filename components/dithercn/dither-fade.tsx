import { cssColor, ditherMaskStyle, DitherShader } from "@/lib/dither";
import type { DitherColor, DitherMatrix } from "@/lib/dither";
import { cn } from "@/lib/utils";

/** The edge of the parent the fade sits on. The colour is solid at that edge. */
export type DitherFadeSide = "top" | "bottom" | "left" | "right";

export interface DitherFadeProps {
  /** The edge of the parent to fade into. Default `"bottom"`. */
  side?: DitherFadeSide;
  /** Depth of the fade: CSS pixels, or any CSS length such as `"30%"`. Default 160. */
  size?: number | string;
  /** The colour the content fades into, usually the next section's background. Default `--dither-paper`. */
  color?: DitherColor;
  /** Threshold matrix. Default `"bayer4"`. */
  matrix?: DitherMatrix;
  /** Cell size in CSS pixels. Default `--dither-cell`. */
  cell?: number;
  /** `true` lets the edge drift slowly, drawn with WebGL. Default `false`, a still CSS fade. */
  animate?: boolean;
  /** Extra classes for the fade's box. */
  className?: string;
}

/** Bands from the content side to the edge. Each one inks more cells. */
const BANDS = 16;

/**
 * Where band `k` starts, as a share of the fade measured from the content
 * side. The coverage follows a gentle curve so the content thins out
 * slowly at first and the last stretch reads as solid.
 */
const BAND_STARTS = Array.from(
  { length: BANDS },
  (_, index) => ((index + 0.5) / BANDS) ** (1 / 1.6) * 100
);

const BOX = {
  bottom: "inset-x-0 bottom-0",
  left: "inset-y-0 left-0",
  right: "inset-y-0 right-0",
  top: "inset-x-0 top-0",
} as const satisfies Record<DitherFadeSide, string>;

/** Clip a full-size layer to the part between `start` and the edge. */
const clipFrom = (side: DitherFadeSide, start: number) => {
  const at = `${start.toFixed(2)}%`;
  switch (side) {
    case "bottom": {
      return `inset(${at} 0 0 0)`;
    }
    case "top": {
      return `inset(0 0 ${at} 0)`;
    }
    case "left": {
      return `inset(0 ${at} 0 0)`;
    }
    case "right": {
      return `inset(0 0 0 ${at})`;
    }
    default: {
      const exhaustive: never = side;
      return exhaustive;
    }
  }
};

const SIDES = { bottom: 0, left: 3, right: 2, top: 1 } as const;

const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float s;
  float along;
  if (fadeSide < 0.5) {
    s = 1.0 - uv.y;
    along = uv.x * res.x / res.y;
  } else if (fadeSide < 1.5) {
    s = uv.y;
    along = uv.x * res.x / res.y;
  } else if (fadeSide < 2.5) {
    s = uv.x;
    along = uv.y * res.y / res.x;
  } else {
    s = 1.0 - uv.x;
    along = uv.y * res.y / res.x;
  }
  float drift = (fbm(vec2(along * 1.6 + t * 0.05, s * 1.2 - t * 0.03)) - 0.5) * 0.35;
  return pow(clamp(s + drift * (1.0 - s), 0.0, 1.0), 1.6);
}
`;

/**
 * A dithered edge that fades a section's content into a solid colour,
 * for the seam between two sections or the end of a clipped list.
 * Place it inside a `relative` parent; it covers `size` along `side`.
 * Still by default and drawn with CSS masks, so it costs no WebGL.
 */
export const DitherFade = ({
  side = "bottom",
  size = 160,
  color = "--dither-paper",
  matrix = "bayer4",
  cell,
  animate = false,
  className,
}: DitherFadeProps) => {
  const depth = typeof size === "number" ? `${size}px` : size;
  const vertical = side === "top" || side === "bottom";
  const box = cn(
    "pointer-events-none absolute overflow-hidden",
    BOX[side],
    className
  );
  const extent = vertical ? { height: depth } : { width: depth };

  if (animate) {
    return (
      <DitherShader
        field={FIELD}
        palette={["transparent", color]}
        matrix={matrix}
        cell={cell}
        uniforms={{ fadeSide: SIDES[side] }}
        className={box}
        style={extent}
      />
    );
  }

  return (
    <div aria-hidden="true" className={box} style={extent}>
      {BAND_STARTS.map((start, index) => (
        <div
          key={start}
          className="absolute inset-0"
          style={{
            ...ditherMaskStyle((index + 1) / BANDS, { cell, matrix }),
            backgroundColor: cssColor(color),
            clipPath: clipFrom(side, start),
          }}
        />
      ))}
    </div>
  );
};
