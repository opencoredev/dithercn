import type { ComponentProps, ReactNode } from "react";

import { ditherMask } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * Behind the label sit eight copies of the hover fill, each masked to one
 * Bayer level. Levels nest, so turning the copies on one after another,
 * lightest first, dissolves the fill in through the matrix; turning them
 * off densest first dissolves it out. Each copy switches with a zero-length
 * opacity transition and its own delay, so a hover that ends halfway
 * reverses from wherever it got to. Reduced motion drops the delays and
 * the fill changes in one step.
 */

export type DitherButtonVariant = "solid" | "outline" | "ghost";
export type DitherButtonSize = "sm" | "md" | "lg";

const LAYERS = 8;
// Milliseconds between levels: the whole dissolve takes about 180ms.
const LAYER_STEP = 26;

const maskRule = (level: number) => {
  const image = ditherMask(level);
  const size = "calc(var(--dither-cell, 3px) * 4)";
  return `-webkit-mask-image:${image};mask-image:${image};-webkit-mask-size:${size};mask-size:${size};`;
};

const STYLES = [
  ...Array.from(
    { length: LAYERS },
    (_, index) =>
      `.dcn-btn-l${index}{${maskRule((index + 1) / LAYERS)}--dcn-in:${index * LAYER_STEP}ms;--dcn-out:${(LAYERS - 1 - index) * LAYER_STEP}ms}`
  ),
  ".dcn-btn-fill{opacity:0;transition:opacity 0s linear var(--dcn-out)}",
  "@media (hover: hover){.dcn-btn:hover .dcn-btn-fill{opacity:1;transition-delay:var(--dcn-in)}}",
  ".dcn-btn:active .dcn-btn-fill{opacity:1;transition-delay:calc(var(--dcn-in) / 2)}",
  "@media (prefers-reduced-motion: reduce){.dcn-btn-fill{transition-delay:0s!important}}",
].join("");

const VARIANT = {
  ghost: {
    fill: "bg-accent",
    layer: "",
    root: "text-foreground",
  },
  outline: {
    // The tint goes on the stack, not each copy, or overlapping copies would add up.
    fill: "bg-dither-ink",
    layer: "opacity-25",
    root: "border-input text-foreground border bg-transparent",
  },
  solid: {
    fill: "bg-[color-mix(in_oklch,var(--primary),var(--foreground)_22%)]",
    layer: "",
    root: "bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.18)]",
  },
} as const satisfies Record<
  DitherButtonVariant,
  { fill: string; layer: string; root: string }
>;

const SIZE = {
  lg: "h-11 gap-2 px-6 text-[15px] [&_svg:not([class*='size-'])]:size-4.5",
  md: "h-9 gap-2 px-4 text-sm",
  sm: "h-8 gap-1.5 px-3 text-[13px]",
} as const satisfies Record<DitherButtonSize, string>;

interface OwnProps {
  /** Default `"solid"`. */
  variant?: DitherButtonVariant;
  /** Default `"md"`. */
  size?: DitherButtonSize;
  children?: ReactNode;
}

type AsButton = Omit<ComponentProps<"button">, "children"> & {
  href?: never;
};

/** With `href`, the button renders as a link. */
type AsLink = Omit<ComponentProps<"a">, "children"> & { href: string };

export type DitherButtonProps = OwnProps & (AsButton | AsLink);

const rootClass = (
  variant: DitherButtonVariant,
  size: DitherButtonSize,
  className: string | undefined
) =>
  cn(
    "dcn-btn group/button relative isolate inline-flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full font-medium whitespace-nowrap select-none",
    "transition-[scale,box-shadow] duration-150 ease-(--ease-out) motion-safe:active:scale-[0.97]",
    "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50 disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    VARIANT[variant].root,
    SIZE[size],
    className
  );

const Fill = ({ variant }: { variant: DitherButtonVariant }) => (
  <span
    aria-hidden="true"
    className={cn("absolute inset-0 -z-10", VARIANT[variant].layer)}
  >
    <style href="dithercn-dither-button" precedence="dithercn">
      {STYLES}
    </style>
    {Array.from({ length: LAYERS }, (_, index) => (
      <span
        key={index}
        className={cn(
          "dcn-btn-fill absolute inset-0",
          `dcn-btn-l${index}`,
          VARIANT[variant].fill
        )}
      />
    ))}
  </span>
);

/**
 * A button whose hover and press fill dissolves in through the Bayer
 * levels. Three variants and three sizes; give it `href` to render a link
 * with the same look.
 */
export const DitherButton = (props: DitherButtonProps) => {
  if (props.href !== undefined) {
    const {
      variant = "solid",
      size = "md",
      className,
      children,
      ...link
    } = props;
    return (
      <a
        data-slot="button"
        data-variant={variant}
        {...link}
        className={rootClass(variant, size, className)}
      >
        <Fill variant={variant} />
        {children}
      </a>
    );
  }
  const {
    variant = "solid",
    size = "md",
    className,
    children,
    type = "button",
    href: _href,
    ...button
  } = props;
  return (
    <button
      data-slot="button"
      data-variant={variant}
      type={type}
      {...button}
      className={rootClass(variant, size, className)}
    >
      <Fill variant={variant} />
      {children}
    </button>
  );
};
