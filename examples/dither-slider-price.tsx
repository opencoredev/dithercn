"use client";

import { useState } from "react";

import { DitherSlider } from "@/components/dithercn/dither-slider";
import { fillStyle } from "@/lib/dither";

// A made-up catalogue: how many products sit in each $50 band up to $1,000.
const BANDS = [
  4, 9, 16, 22, 27, 25, 21, 18, 14, 12, 10, 9, 7, 6, 5, 4, 3, 3, 2, 2,
] as const;
const BAND = 50;
const TALLEST = Math.max(...BANDS);
/** Half the width of a `md` thumb at the default cell: where its centre stops at each end. */
const THUMB_HALF = 9;

const IN_RANGE = fillStyle("gradient", {
  cell: 2,
  color: "green",
  edge: "bottom",
  length: 14,
  to: 4 / 16,
});
const OUT_OF_RANGE = fillStyle("dotted", { cell: 2, color: "grey" });

const count = ([low = 0, high = 0]: readonly number[]) => {
  let total = 0;
  for (const [index, products] of BANDS.entries()) {
    const start = index * BAND;
    if (start >= low && start < high) {
      total += products;
    }
  }
  return total;
};

/** Products per band, lit inside the selected range. */
const Histogram = ({ range }: { range: readonly number[] }) => {
  const [low = 0, high = 0] = range;
  return (
    <div
      aria-hidden="true"
      className="mb-1 flex h-14 items-end gap-0.5"
      style={{ marginInline: THUMB_HALF }}
    >
      {BANDS.map((products, index) => {
        const start = index * BAND;
        const inside = start >= low && start < high;
        return (
          <div
            // Bands are fixed and in order.
            // oxlint-disable-next-line no-array-index-key
            key={index}
            className="flex-1"
            style={{
              height: `${(products / TALLEST) * 100}%`,
              ...(inside ? IN_RANGE : OUT_OF_RANGE),
            }}
          />
        );
      })}
    </div>
  );
};

const dollars = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

export default function DitherSliderPrice() {
  const [range, setRange] = useState([150, 600]);

  return (
    <div className="bg-background border-border flex w-full max-w-sm flex-col gap-4 rounded-2xl border p-5 [--dither-paper:var(--background)]">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-medium">Price</span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {range.map((price) => dollars.format(price)).join(" – ")}
        </span>
      </div>
      <div>
        <Histogram range={range} />
        <DitherSlider
          label="Price"
          value={range}
          onValueChange={setRange}
          min={0}
          max={1000}
          step={BAND}
          minStepsBetweenThumbs={1}
          format={{
            currency: "USD",
            maximumFractionDigits: 0,
            style: "currency",
          }}
          color="green"
          hideLabel
          showRange
        />
      </div>
      <div className="border-border flex items-center justify-between gap-4 border-t pt-4 text-sm">
        <span className="text-muted-foreground">
          <span className="text-foreground font-medium tabular-nums">
            {count(range)}
          </span>{" "}
          products in range
        </span>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground focus-visible:outline-ring cursor-pointer rounded-sm text-xs outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2"
          onClick={() => setRange([0, 1000])}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
