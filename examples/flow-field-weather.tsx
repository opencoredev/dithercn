import { FlowField } from "@/components/dithercn/flow-field";
import { cssColor } from "@/lib/dither";
import type { DitherPalette } from "@/lib/dither";

// Paper, then the streamlines, then the streaks from light wind to strong.
const PALETTE = [
  "--dither-paper",
  "color-mix(in oklch, var(--dither-color-blue) 55%, var(--dither-paper))",
  "green",
  "orange",
] as const satisfies DitherPalette;

const KEY = [
  { color: PALETTE[1], label: "Light" },
  { color: PALETTE[2], label: "Fresh" },
  { color: PALETTE[3], label: "Strong" },
];

export default function FlowFieldWeather() {
  return (
    <section className="relative isolate size-full">
      <FlowField
        variant="lines"
        density={1.15}
        turbulence={1.15}
        scale={1.15}
        trail={0.7}
        angle={105}
        cell={2}
        levels={19}
        palette={PALETTE}
        className="absolute inset-0 -z-10"
      />
      <figure className="bg-background/85 absolute bottom-4 left-4 flex flex-col gap-2 rounded-lg border px-3 py-2.5 backdrop-blur-sm">
        <figcaption className="text-muted-foreground font-mono text-[10px] tracking-[0.08em] uppercase">
          Surface wind
        </figcaption>
        <ul className="flex gap-3 text-xs">
          {KEY.map(({ color, label }) => (
            <li key={label} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ backgroundColor: cssColor(color) }}
              />
              {label}
            </li>
          ))}
        </ul>
      </figure>
    </section>
  );
}
