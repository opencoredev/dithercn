import { toCSS } from "@/lib/dither/export";

const LEVELS = [0.125, 0.25, 0.5, 0.75] as const;

// Mask mode paints the element with --dither-ink, so the tiles follow the
// theme. Each rule is built on the server; no JavaScript runs in the page.
const rules = LEVELS.map((level, index) =>
  toCSS({
    cell: 4,
    ink: "--dither-ink",
    level,
    mode: "mask",
    selector: `.export-tile-${index}`,
  })
).join("\n");

export default function ExportTile() {
  return (
    <div className="grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
      <style>{rules}</style>
      {LEVELS.map((level, index) => (
        <figure key={level} className="grid gap-2">
          <div
            aria-hidden="true"
            className={`export-tile-${index} aspect-square w-full rounded-xl`}
          />
          <figcaption className="text-muted-foreground font-mono text-xs tabular-nums">
            level {level}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
