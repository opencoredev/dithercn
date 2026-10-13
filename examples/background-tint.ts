import { cssColor } from "@/lib/dither";
import type { DitherColor } from "@/lib/dither";

// Site-only helpers for the background demos' colour knob.

/** `color` mixed into the paper at `share` percent, for in-between tones. */
export const toward = (
  color: DitherColor,
  share: number,
  base = "--dither-paper"
) => `color-mix(in oklch, ${cssColor(color)} ${share}%, ${cssColor(base)})`;
