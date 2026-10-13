import { ditherMaskStyle } from "@/lib/dither";
import { cn } from "@/lib/utils";

/**
 * Site illustration, not a registry piece: the 17 threshold levels of a
 * 4x4 Bayer matrix, drawn left to right like a printer's calibration strip.
 * Each level is a CSS mask tile, so the dots take their colour from
 * `--dither-ink` and stay crisp at any width.
 */
export const LEVEL_COUNT = 17;

/**
 * Inline style that paints an element's background through one of the 17
 * Bayer levels, repeated at `--dither-cell`. Pair it with `bg-dither-ink`.
 */
export const bayerMask = (level: number): React.CSSProperties =>
  ditherMaskStyle(level / (LEVEL_COUNT - 1));

const LEVELS = Array.from({ length: LEVEL_COUNT }, (_, level) => ({
  level,
  style: bayerMask(level),
}));

export const BayerRamp = ({ className }: { className?: string }) => (
  <figure className={cn("flex flex-col gap-3", className)}>
    <div
      className="grid h-24 grid-cols-17 gap-px sm:h-32 lg:h-40"
      aria-hidden="true"
    >
      {LEVELS.map(({ level, style }) => (
        <div
          key={level}
          className="bayer-ramp-step bg-dither-ink"
          style={{ ...style, animationDelay: `${level * 24 + 120}ms` }}
        />
      ))}
    </div>
    <div
      className="text-muted-foreground grid grid-cols-17 gap-px font-mono text-[0.65rem] tabular-nums sm:text-xs"
      aria-hidden="true"
    >
      {LEVELS.map(({ level }) => (
        <span
          key={level}
          className={cn("text-center", level % 4 !== 0 && "max-sm:invisible")}
        >
          {level}
        </span>
      ))}
    </div>
    <figcaption className="text-muted-foreground text-sm">
      The 17 levels of a 4×4 Bayer matrix, from no ink to solid. Every ordered
      dither the engine draws is built from steps like these.
    </figcaption>
  </figure>
);
