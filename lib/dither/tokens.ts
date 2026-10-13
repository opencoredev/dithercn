/** A colour as red, green, blue and alpha, each in [0, 1]. */
export type Rgba = readonly [number, number, number, number];

/**
 * A colour the dither components accept: a CSS variable name such as
 * `"--dither-ink"`, or any CSS colour such as `"var(--chart-1)"`,
 * `"oklch(0.7 0.15 272)"` or `"#fff"`.
 */
export type DitherColor = string;

/** Colours from tone 0 (paper) to tone 1 (ink). At least two. */
export type DitherPalette = readonly [
  DitherColor,
  DitherColor,
  ...DitherColor[],
];

/** Paper to ink, from the `dither-tokens` CSS variables. */
export const DEFAULT_PALETTE = [
  "--dither-paper",
  "--dither-ink",
] as const satisfies DitherPalette;

/** `"--chart-1"` becomes `"var(--chart-1)"`; anything else passes through. */
export const cssColor = (value: DitherColor): string =>
  value.startsWith("--") ? `var(${value})` : value;

/**
 * Motion tokens shared by every component: one ease-out curve and three
 * durations in milliseconds. `ease` matches the site's `--ease-out`.
 */
export const MOTION = {
  base: 240,
  ease: "cubic-bezier(0.23, 1, 0.32, 1)",
  fast: 150,
  slow: 600,
} as const;
