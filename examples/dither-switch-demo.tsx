"use client";

import { useId } from "react";

import { DitherSwitch } from "@/components/dithercn/dither-switch";
import { usePreviewValue } from "@/components/preview-controls";
import * as knobs from "@/examples/dither-switch-controls";

const ROWS = [
  {
    checked: true,
    description: "Ship every push to main",
    label: "Auto-deploy",
  },
  {
    checked: false,
    description: "Post a preview link on each pull request",
    label: "Preview comments",
  },
] as const;

export default function DitherSwitchDemo() {
  const id = useId();
  const look = {
    bloom: usePreviewValue(knobs.bloom),
    cell: usePreviewValue(knobs.cell),
    color: usePreviewValue(knobs.tint),
    disabled: usePreviewValue(knobs.disabled),
    fill: usePreviewValue(knobs.fill),
    size: usePreviewValue(knobs.size),
  };

  return (
    <div className="bg-background ring-border flex w-full max-w-sm flex-col rounded-xl ring-1">
      {ROWS.map((row, index) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-6 border-b px-5 py-4 last:border-b-0"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <label htmlFor={`${id}-${index}`} className="text-sm font-medium">
              {row.label}
            </label>
            <span
              id={`${id}-${index}-description`}
              className="text-muted-foreground text-sm text-pretty"
            >
              {row.description}
            </span>
          </div>
          <DitherSwitch
            id={`${id}-${index}`}
            aria-describedby={`${id}-${index}-description`}
            defaultChecked={row.checked}
            {...look}
          />
        </div>
      ))}
    </div>
  );
}
