import { DitherPattern, DitherShader } from "@/lib/dither";

const RAMP = `float field(vec2 uv, vec2 res, float t) { return uv.x; }`;

const BARS = [
  { height: 46, level: 0.25 },
  { height: 72, level: 0.5 },
  { height: 58, level: 0.75 },
  { height: 88, level: 1 },
] as const;

export default function ConceptPalettes() {
  return (
    <div className="grid w-full gap-6 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-end">
      <div className="flex flex-col gap-4">
        <figure className="flex flex-col gap-1.5">
          <DitherShader
            field={RAMP}
            animate={false}
            className="h-12 rounded-lg"
          />
          <figcaption className="text-muted-foreground text-xs">
            Two colours:{" "}
            <span className="text-foreground font-mono">--dither-paper</span> to{" "}
            <span className="text-foreground font-mono">--dither-ink</span>
          </figcaption>
        </figure>
        <figure className="flex flex-col gap-1.5">
          <DitherShader
            field={RAMP}
            animate={false}
            palette={["--background", "--chart-3", "--chart-2", "--chart-1"]}
            className="h-12 rounded-lg"
          />
          <figcaption className="text-muted-foreground text-xs">
            Four colours:{" "}
            <span className="text-foreground font-mono">--background</span> then{" "}
            <span className="text-foreground font-mono">--chart-3</span> to{" "}
            <span className="text-foreground font-mono">--chart-1</span>
          </figcaption>
        </figure>
      </div>
      <figure className="flex flex-col gap-1.5">
        <svg
          viewBox="0 0 160 100"
          className="h-auto w-full"
          role="img"
          aria-label="Four bars filled at 25, 50, 75 and 100 percent ink"
        >
          <defs>
            {BARS.map(({ level }) => (
              <DitherPattern
                key={level}
                id={`palette-bar-${level}`}
                level={level}
                cell={3}
              />
            ))}
          </defs>
          {BARS.map(({ height, level }, index) => (
            <rect
              key={level}
              x={index * 40 + 4}
              y={100 - height}
              width={32}
              height={height}
              fill={`url(#palette-bar-${level})`}
            />
          ))}
        </svg>
        <figcaption className="text-muted-foreground text-xs">
          <span className="text-foreground font-mono">DitherPattern</span> fills
        </figcaption>
      </figure>
    </div>
  );
}
