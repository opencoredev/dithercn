import { cn } from "@/lib/utils";

/**
 * The dithercn mark: a 4x4 dot grid whose columns hold 1, 2, 3 and 4 lit
 * dots, a dithered ramp at the smallest size that still reads.
 */
const LIT_CELLS = [
  [0, 0],
  [2, 0],
  [3, 0],
  [1, 1],
  [3, 1],
  [2, 2],
  [3, 2],
  [1, 3],
  [2, 3],
  [3, 3],
] as const satisfies readonly (readonly [x: number, y: number])[];

const CELL = 6;
const DOT = 5;

const rects = (fill: string) =>
  LIT_CELLS.map(
    ([x, y]) =>
      `<rect x="${x * CELL}" y="${y * CELL}" width="${DOT}" height="${DOT}" fill="${fill}"/>`
  ).join("");

export const getLogoMarkSVG = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" shape-rendering="crispEdges">${rects(color)}</svg>`;

export const LogoMark = ({
  className,
  ...props
}: React.ComponentProps<"svg">) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 23 23"
    shapeRendering="crispEdges"
    fill="currentColor"
    aria-hidden="true"
    className={cn("size-4", className)}
    {...props}
  >
    {LIT_CELLS.map(([x, y]) => (
      <rect
        key={`${x}-${y}`}
        x={x * CELL}
        y={y * CELL}
        width={DOT}
        height={DOT}
      />
    ))}
  </svg>
);

export const Wordmark = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center gap-2 font-mono text-[0.9rem] font-medium tracking-tight",
      className
    )}
  >
    <LogoMark className="text-primary size-[18px]" />
    dithercn
  </span>
);
