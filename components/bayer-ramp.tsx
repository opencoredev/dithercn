import { cn } from "@/lib/utils";

/**
 * Site illustration, not a registry piece: the 17 threshold levels of a
 * 4x4 Bayer matrix, drawn left to right like a printer's calibration strip.
 * Each level is a CSS mask tile, so the dots take their colour from
 * `--dither-ink` and stay crisp at any width.
 */
const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

const LEVEL_COUNT = 17;

const maskForLevel = (level: number) => {
  const dots = BAYER_4.flatMap((row, y) =>
    row.flatMap((threshold, x) =>
      threshold < level
        ? [`<rect x="${x}" y="${y}" width="1" height="1"/>`]
        : []
    )
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4" shape-rendering="crispEdges">${dots}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const LEVELS = Array.from({ length: LEVEL_COUNT }, (_, level) => ({
  level,
  mask: maskForLevel(level),
}));

export const BayerRamp = ({ className }: { className?: string }) => (
  <figure className={cn("flex flex-col gap-3", className)}>
    <div
      className="grid h-24 grid-cols-17 gap-px sm:h-32 lg:h-40"
      aria-hidden="true"
    >
      {LEVELS.map(({ level, mask }) => (
        <div
          key={level}
          className="bayer-ramp-step bg-dither-ink"
          style={{
            WebkitMaskImage: mask,
            WebkitMaskSize: "calc(var(--dither-cell) * 4)",
            animationDelay: `${level * 24 + 120}ms`,
            maskImage: mask,
            maskSize: "calc(var(--dither-cell) * 4)",
          }}
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
      dither in the catalog is built from steps like these.
    </figcaption>
  </figure>
);
