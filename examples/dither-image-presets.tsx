"use client";

import { DitherImage } from "@/components/dithercn/dither-image";
import type { DitherImageProps } from "@/components/dithercn/dither-image";

const LOOKS: readonly {
  label: string;
  look: Pick<DitherImageProps, "preset" | "color" | "palette">;
}[] = [
  { label: "ink", look: { color: "orange", preset: "ink" } },
  { label: "duotone", look: { color: "orange", preset: "duotone" } },
  { label: "newsprint", look: { preset: "newsprint" } },
  { label: "gameboy", look: { preset: "gameboy" } },
  { label: "riso", look: { preset: "riso" } },
  {
    label: "palette: paper, green, pink",
    look: { palette: ["--dither-paper", "green", "pink"] },
  },
];

export default function DitherImagePresets() {
  return (
    <div className="grid w-full grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
      {LOOKS.map(({ label, look }) => (
        <figure key={label} className="flex flex-col gap-2">
          <DitherImage
            {...look}
            src="/examples/tetons.jpg"
            alt=""
            ratio={5 / 4}
            className="w-full rounded-lg"
          />
          <figcaption className="text-muted-foreground truncate font-mono text-xs">
            {label}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
