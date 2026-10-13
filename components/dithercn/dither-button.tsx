"use client";

import { Slot } from "radix-ui";
import type { ComponentProps, CSSProperties, ReactNode } from "react";

import {
  bloomStyle,
  cssColor,
  ditherRamp,
  fillStyle,
  fillTile,
} from "@/lib/dither";
import type { Bloom, DitherColor, FillVariant } from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * The fill is three stacked layers in the button's colour: rest, hover
 * and press. Each layer is a denser version of the one under it, so the
 * hover layer fading in over the rest layer reads as the dither easing
 * denser, and the press layer does it again. Only opacity animates; the
 * masks stay on the cell grid. Every texture rises from the bottom edge
 * and thins out through the Bayer levels as it goes: halfway up at rest,
 * most of the way on hover, all over while pressed, so the label sits on
 * a quiet field until you act. Solid lays a lighter ramp over flat colour.
 */

export type DitherButtonVariant = "filled" | "outline";
export type DitherButtonSize = "sm" | "md" | "lg" | "icon";

const HEIGHT = { icon: 36, lg: 44, md: 36, sm: 32 } as const satisfies Record<
  DitherButtonSize,
  number
>;

const SIZE = {
  icon: "size-9 rounded-[9px]",
  lg: "h-11 gap-2 rounded-[11px] px-5 text-[15px] [&_svg:not([class*='size-'])]:size-4.5",
  md: "h-9 gap-2 rounded-[9px] px-4 text-sm",
  sm: "h-8 gap-1.5 rounded-[8px] px-3 text-[13px]",
} as const satisfies Record<DitherButtonSize, string>;

type Layers = readonly [
  CSSProperties | null,
  CSSProperties | null,
  CSSProperties,
];

/** How far up the button each layer's texture reaches, as a share of its height. */
const REACH = [0.4, 0.75, 1.2] as const;

/** Coverage of a gradient fill at the bottom edge and at the top of its reach. */
const GRADIENT = [
  { from: 1, to: 0 },
  { from: 1, to: 0.0625 },
  { from: 1, to: 0.25 },
] as const;

const svgUrl = (width: number, height: number, path: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges"><path d="${path}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const px = (cells: number, cell: number) => `${cells * cell}px`;

interface LayerOptions {
  fill: FillVariant;
  color: DitherColor;
  cell: number;
  /** Height of the button in cells. */
  rows: number;
}

/**
 * A dotted or hatched tile cut by a dithered ramp from the bottom edge,
 * so the texture thins out as it rises instead of stopping at a line.
 */
const texturedLayer = (
  variant: "dotted" | "hatched",
  { color, cell, rows }: LayerOptions,
  index: 0 | 1 | 2
): CSSProperties => {
  const tile = fillTile(variant);
  const ramp = ditherRamp({
    edge: "bottom",
    extent: rows,
    from: 1,
    length: Math.max(2, Math.round(rows * REACH[index])),
    // Blue noise, because Bayer thresholds line up with the dot and hatch
    // tiles and would cut whole rows out of them.
    matrix: "blue-noise",
    to: index === 2 ? 0.5 : 0,
  });
  const image = `${svgUrl(tile.size, tile.size, tile.path)}, ${svgUrl(ramp.width, ramp.height, ramp.path)}`;
  const size = `${px(tile.size, cell)} ${px(tile.size, cell)}, ${px(ramp.width, cell)} ${px(ramp.height, cell)}`;
  return {
    WebkitMaskComposite: "source-in",
    WebkitMaskImage: image,
    WebkitMaskPosition: "left bottom, left bottom",
    WebkitMaskRepeat: "repeat, repeat-x",
    WebkitMaskSize: size,
    backgroundColor: cssColor(color),
    maskComposite: "intersect",
    maskImage: image,
    maskPosition: "left bottom, left bottom",
    maskRepeat: "repeat, repeat-x",
    maskSize: size,
  };
};

const gradientLayer = (
  { color, cell, rows }: LayerOptions,
  index: 0 | 1 | 2
): CSSProperties =>
  fillStyle("gradient", {
    cell,
    color,
    edge: "bottom",
    from: GRADIENT[index].from,
    length: Math.max(2, Math.round(rows * REACH[index])),
    to: GRADIENT[index].to,
  });

// Solid: flat colour, then a lighter tint dithered up from the bottom.
const solidLayers = ({ color, cell, rows }: LayerOptions): Layers => {
  const light = `color-mix(in oklab, ${cssColor(color)}, white 35%)`;
  const ramp = (index: 1 | 2) =>
    fillStyle("gradient", {
      cell,
      color: light,
      edge: "bottom",
      from: index === 1 ? 0.75 : 1,
      length: Math.max(2, Math.round(rows * REACH[index])),
      to: 0,
    });
  return [{ backgroundColor: cssColor(color) }, ramp(1), ramp(2)];
};

const layersFor = (options: LayerOptions): Layers => {
  const { fill } = options;
  switch (fill) {
    case "gradient": {
      return [
        gradientLayer(options, 0),
        gradientLayer(options, 1),
        gradientLayer(options, 2),
      ];
    }
    case "dotted":
    case "hatched": {
      return [
        texturedLayer(fill, options, 0),
        texturedLayer(fill, options, 1),
        texturedLayer(fill, options, 2),
      ];
    }
    case "solid": {
      return solidLayers(options);
    }
    default: {
      const exhaustive: never = fill;
      return exhaustive;
    }
  }
};

const STYLES = [
  ".dcn-btn-l1,.dcn-btn-l2{opacity:0;transition:opacity 220ms cubic-bezier(0.23,1,0.32,1)}",
  "@media (hover:hover){.dcn-btn:hover .dcn-btn-l1{opacity:1}}",
  ".dcn-btn:focus-visible .dcn-btn-l1{opacity:1}",
  ".dcn-btn:active .dcn-btn-l1,.dcn-btn:active .dcn-btn-l2{opacity:1;transition-duration:90ms}",
  "@keyframes dcn-btn-busy{from{opacity:0}to{opacity:1}}",
  ".dcn-btn[data-loading] .dcn-btn-l1{animation:dcn-btn-busy 0.9s cubic-bezier(0.77,0,0.175,1) infinite alternate}",
  "@keyframes dcn-btn-step{0%,100%{opacity:0.25}33%{opacity:1}}",
  ".dcn-btn-dot{animation:dcn-btn-step 0.9s steps(1,end) infinite}",
  "@media (prefers-reduced-motion:reduce){.dcn-btn-l1,.dcn-btn-l2{transition:none}.dcn-btn[data-loading] .dcn-btn-l1,.dcn-btn-dot{animation:none}}",
].join("");

const LAYER_CLASS = ["dcn-btn-l0", "dcn-btn-l1", "dcn-btn-l2"] as const;

interface FillProps extends LayerOptions {
  variant: DitherButtonVariant;
  bloom: Bloom;
}

const Fill = ({ variant, bloom, ...options }: FillProps) => {
  const layers = layersFor(options);
  // Outline buttons start bare: the rest texture becomes the hover state.
  const shown: Layers =
    variant === "outline" ? [null, layers[0], layers[1] ?? {}] : layers;
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
      style={bloomStyle(options.color, bloom)}
    >
      <style href="dithercn-dither-button" precedence="dithercn">
        {STYLES}
      </style>
      {shown.map((style, index) =>
        style === null ? null : (
          <span
            key={LAYER_CLASS[index]}
            className={cn(
              "absolute inset-0 rounded-[inherit]",
              LAYER_CLASS[index]
            )}
            style={style}
          />
        )
      )}
    </span>
  );
};

/** Three cells stepping in turn, shown before the label while loading. */
const Busy = () => (
  <span aria-hidden="true" className="inline-flex items-center gap-[3px]">
    {[0, 0.3, 0.6].map((delay) => (
      <span
        key={delay}
        className="dcn-btn-dot size-[3px] bg-current"
        style={{ animationDelay: `${delay}s` }}
      />
    ))}
  </span>
);

const surfaceStyle = (
  variant: DitherButtonVariant,
  fill: FillVariant,
  color: DitherColor
): CSSProperties => {
  const ink = cssColor(color);
  const edge = `inset 0 0 0 1px color-mix(in oklab, ${ink} 45%, transparent)`;
  if (variant === "outline") {
    return { boxShadow: edge };
  }
  if (fill === "solid") {
    return { boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.22)" };
  }
  return {
    backgroundColor: `color-mix(in oklab, ${ink} 14%, transparent)`,
    boxShadow: edge,
  };
};

interface OwnProps {
  /** `filled` shows the texture at rest; `outline` starts bare and fills in on hover. Default `"filled"`. */
  variant?: DitherButtonVariant;
  /** Texture of the fill. Default `"gradient"`. */
  fill?: FillVariant;
  /** A palette name or any CSS colour. Default `"ink"`. */
  color?: DitherColor;
  /** Default `"md"`. `icon` is a square for a lone icon; give it an `aria-label`. */
  size?: DitherButtonSize;
  /** A soft glow in the button's colour. Default `"off"`. */
  bloom?: Bloom;
  /** Size of one dither cell in CSS pixels. Default 2. */
  cell?: number;
  /** Show a busy state: the label stays, the button ignores clicks and reports `aria-busy`. Default `false`. */
  loading?: boolean;
  /** Render your own element (a link) with the button's look, as shadcn's `asChild`. Default `false`. */
  asChild?: boolean;
  children?: ReactNode;
}

export type DitherButtonProps = OwnProps &
  Omit<ComponentProps<"button">, "children" | "color">;

const rootClass = (size: DitherButtonSize, className: string | undefined) =>
  cn(
    "dcn-btn group/button relative isolate inline-flex shrink-0 cursor-pointer items-center justify-center font-medium whitespace-nowrap select-none",
    "text-foreground transition-[scale] duration-150 ease-(--ease-out) motion-safe:active:scale-[0.97]",
    // An outline, not a ring: the edge is an inline box-shadow and would hide a ring.
    "outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
    "disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45",
    "data-loading:cursor-progress",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    SIZE[size],
    className
  );

/**
 * A real `<button>` filled with a dither texture in any palette colour.
 * The texture eases denser on hover and denser again while pressed. Four
 * fills, two variants, four sizes, a loading state, and `asChild` to put
 * the look on a link.
 */
export const DitherButton = ({
  variant = "filled",
  fill = "gradient",
  color = "ink",
  size = "md",
  bloom = "off",
  cell = 2,
  loading = false,
  asChild = false,
  className,
  style,
  children,
  type,
  disabled,
  onClick,
  ...props
}: DitherButtonProps) => {
  const Comp = asChild ? Slot.Root : "button";
  const step = Math.max(1, Math.round(cell));
  const solid = fill === "solid" && variant === "filled";
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-fill={fill}
      data-loading={loading ? "" : undefined}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      // A link has no `type` or `disabled`; a button defaults to type="button".
      type={asChild ? undefined : (type ?? "button")}
      disabled={asChild ? undefined : disabled}
      onClick={loading ? (event) => event.preventDefault() : onClick}
      {...props}
      className={cn(
        rootClass(size, className),
        // Textured fills get a halo in the page colour, so the label stays
        // legible when the dense press layer runs behind it.
        solid
          ? "text-white dark:text-black"
          : "[text-shadow:0_0_2px_var(--background),0_0_4px_var(--background)]"
      )}
      style={{ ...surfaceStyle(variant, fill, color), ...style }}
    >
      <Fill
        variant={variant}
        bloom={bloom}
        fill={fill}
        color={color}
        cell={step}
        rows={Math.round(HEIGHT[size] / step)}
      />
      {loading ? <Busy /> : null}
      <Slot.Slottable>{children}</Slot.Slottable>
    </Comp>
  );
};
