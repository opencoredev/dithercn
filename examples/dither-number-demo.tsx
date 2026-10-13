"use client";

import { useEffect, useState } from "react";

import { DitherNumber } from "@/components/dithercn/dither-number";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/dither-number-controls";

const FORMATS = {
  compact: {
    format: { maximumFractionDigits: 1, notation: "compact" },
    label: "Frames dithered",
    scale: 1,
  },
  currency: {
    format: { currency: "USD", maximumFractionDigits: 0, style: "currency" },
    label: "Monthly recurring revenue",
    scale: 1,
  },
  integer: {
    format: {},
    label: "Components installed this month",
    scale: 1,
  },
  percent: {
    format: {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
      style: "percent",
    },
    label: "Week over week growth",
    scale: 1 / 1_000_000,
  },
} satisfies Record<
  "integer" | "currency" | "percent" | "compact",
  { format: Intl.NumberFormatOptions; label: string; scale: number }
>;

export default function DitherNumberDemo() {
  const effect = usePreviewValue(knobs.effect);
  const style = usePreviewValue(knobs.style);
  const accent = usePreviewValue(knobs.accent);
  const duration = usePreviewValue(knobs.duration);
  const stagger = usePreviewValue(knobs.stagger);
  const [value, setValue] = useState(128_406);

  useEffect(() => {
    const timer = setInterval(
      () =>
        setValue((current) => current + 37 + Math.round(Math.random() * 480)),
      2600
    );
    return () => clearInterval(timer);
  }, []);

  const { format, label, scale } = FORMATS[style];

  return (
    <div className="flex flex-col items-center gap-8 px-6 text-center">
      <DitherNumber
        value={value * scale}
        format={format}
        locales="en-US"
        effect={effect}
        accent={accent}
        duration={duration}
        stagger={stagger}
        size="display"
        trigger="mount"
      />
      <span className="text-muted-foreground text-sm">{label}</span>
    </div>
  );
}
