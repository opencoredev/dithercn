"use client";

import { useEffect, useState } from "react";

import { ScrambleText } from "@/components/dithercn/scramble-text";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/scramble-text-controls";

const USES = ["landing pages", "dashboards", "status pages", "changelogs"];

export default function ScrambleTextDemo() {
  const mode = usePreviewValue(knobs.mode);
  const caret = usePreviewValue(knobs.caret);
  const color = usePreviewValue(knobs.tint);
  const speed = usePreviewValue(knobs.speed);
  const stagger = usePreviewValue(knobs.stagger);
  const [use, setUse] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setUse((value) => (value + 1) % USES.length),
      3200
    );
    return () => clearInterval(timer);
  }, []);

  const shared = { color, mode, speed, stagger };

  return (
    <div className="flex w-full max-w-xl flex-col items-start gap-5 px-6">
      <ScrambleText
        {...shared}
        trigger="mount"
        characters="abcdefghijklmnopqrstuvwxyz0123456789"
        className="text-muted-foreground font-mono text-xs tracking-[0.16em] uppercase"
      >
        Release 2.4 · Text
      </ScrambleText>
      <h2 className="text-4xl leading-[1.05] font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
        <ScrambleText {...shared} trigger="mount" delay={160}>
          Dither kit for
        </ScrambleText>{" "}
        <ScrambleText
          {...shared}
          trigger="mount"
          delay={420}
          caret={caret}
          className="text-dither-ink"
        >
          {USES[use] ?? ""}
        </ScrambleText>
      </h2>
    </div>
  );
}
