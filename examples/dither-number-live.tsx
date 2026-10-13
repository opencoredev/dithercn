"use client";

import { useEffect, useState } from "react";

import { DitherNumber } from "@/components/dithercn/dither-number";

const START = 4812.4;

export default function DitherNumberLive() {
  const [value, setValue] = useState(START);

  useEffect(() => {
    const timer = setInterval(() => {
      // A gentle random walk, like a live revenue ticker.
      setValue((current) =>
        Math.max(
          0,
          Math.round((current + (Math.random() - 0.35) * 140) * 10) / 10
        )
      );
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-background flex w-full max-w-xs flex-col gap-1 rounded-2xl p-5">
      <span className="text-muted-foreground text-sm">Revenue today</span>
      <DitherNumber
        value={value}
        from={START}
        effect="dissolve"
        format={{
          currency: "USD",
          minimumFractionDigits: 2,
          style: "currency",
        }}
        locales="en-US"
        cell={2}
        className="text-4xl font-semibold tracking-[-0.04em]"
      />
      <span className="text-muted-foreground text-xs">
        Updates every few seconds
      </span>
    </div>
  );
}
