import type { ComponentProps, CSSProperties, ReactNode } from "react";

import { ditherMask } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * The big code is the same text drawn several times, one copy per dither
 * level. Each copy is masked to its level and clipped to a band from the
 * top, the denser the shorter, so the digits read as solid ink at the top
 * that thins out towards the baseline. On mount the copies appear one
 * after another, lightest first, and the digits print in through the
 * levels. Reduced motion shows them finished.
 */

const LAYERS = [
  { cover: 100, level: 2 / 16 },
  { cover: 92, level: 4 / 16 },
  { cover: 84, level: 6 / 16 },
  { cover: 76, level: 8 / 16 },
  { cover: 68, level: 10 / 16 },
  { cover: 60, level: 12 / 16 },
  { cover: 52, level: 14 / 16 },
  { cover: 44, level: 1 },
] as const;

// Milliseconds between layers as the digits print in.
const LAYER_STEP = 70;

const maskRule = (level: number) => {
  const image = ditherMask(level);
  const size = "calc(var(--dcn-cell) * 4)";
  return `-webkit-mask-image:${image};mask-image:${image};-webkit-mask-size:${size};mask-size:${size};`;
};

const STYLES = [
  ...LAYERS.map(({ level }, index) => `.dcn-404-l${index}{${maskRule(level)}}`),
  "@keyframes dcn-404-in{from{opacity:0}to{opacity:1}}",
  ".dcn-404-layer{animation:dcn-404-in 0s linear both;animation-delay:var(--dcn-delay)}",
  "@media (prefers-reduced-motion: reduce){.dcn-404-layer{animation:none}}",
].join("");

type StyleWithVars = CSSProperties & Record<`--${string}`, string>;

export type NotFoundProps = Omit<ComponentProps<"section">, "title"> & {
  /** The big code. Default `"404"`. */
  code?: string;
  /** The heading. Default `"Page not found"`. */
  title?: ReactNode;
  /** A sentence under the heading. */
  description?: ReactNode;
  /** Buttons or links, such as a way home. */
  actions?: ReactNode;
  /** Heading level. Use `"h1"` on a page of its own. Default `"h1"`. */
  titleAs?: "h1" | "h2";
  /** Ink colour of the code. Default `--dither-ink`. */
  color?: string;
  /** Size of one dither cell in CSS pixels. Default 4. */
  cell?: number;
  /** Print the digits in on mount. Default `true`. */
  animate?: boolean;
};

const toCss = (color: string) =>
  color.startsWith("--") ? `var(${color})` : color;

/**
 * A complete 404 block: a big dithered code, a heading, a sentence and
 * your actions. Drop it into `app/not-found.tsx`.
 */
export const NotFound = ({
  code = "404",
  title = "Page not found",
  description = "The link may be broken, or the page may have moved.",
  actions,
  titleAs: Heading = "h1",
  color = "--dither-ink",
  cell = 4,
  animate = true,
  className,
  style,
  ...props
}: NotFoundProps) => {
  const root: StyleWithVars = {
    "--dcn-cell": `${cell}px`,
    "--dcn-code": toCss(color),
    ...style,
  };
  return (
    <section
      data-slot="not-found"
      className={cn(
        "flex flex-col items-center px-6 py-16 text-center",
        className
      )}
      {...props}
      style={root}
    >
      <style href="dithercn-not-found" precedence="dithercn">
        {STYLES}
      </style>
      <div
        aria-hidden="true"
        className="relative text-[clamp(7rem,30vw,15rem)] leading-[0.8] font-bold tracking-[-0.06em] tabular-nums select-none"
      >
        {/* Sizes the box; the copies sit on top of it. */}
        <span className="invisible block">{code}</span>
        {LAYERS.map(({ cover }, index) => {
          const layer: StyleWithVars = {
            "--dcn-delay": animate ? `${120 + index * LAYER_STEP}ms` : "0ms",
            clipPath: `inset(0 0 ${100 - cover}% 0)`,
          };
          return (
            <span
              key={cover}
              className={cn(
                "absolute inset-0 block bg-(--dcn-code) bg-clip-text text-transparent",
                animate && "dcn-404-layer",
                `dcn-404-l${index}`
              )}
              style={layer}
            >
              {code}
            </span>
          );
        })}
      </div>
      <div className="mt-8 flex max-w-md flex-col gap-2">
        <Heading className="text-2xl font-semibold tracking-tight text-balance">
          {title}
        </Heading>
        {description === undefined ? null : (
          <p className="text-muted-foreground text-pretty">{description}</p>
        )}
      </div>
      {actions === undefined ? null : (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {actions}
        </div>
      )}
    </section>
  );
};
