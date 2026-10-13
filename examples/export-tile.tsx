import { toCSS } from "@/lib/dither/export";

// Four bands of falling coverage make a stepped dither fade in pure CSS.
// Mask mode paints with --dither-ink, so the bands follow the theme; the
// rules are built on the server and the page runs no script for them.
const BANDS = [0.75, 0.5, 0.25, 0.125] as const;

const rules = BANDS.map((level, index) =>
  toCSS({
    cell: 4,
    ink: "--dither-ink",
    level,
    mode: "mask",
    selector: `.export-band-${index}`,
  })
).join("\n");

export default function ExportTile() {
  return (
    <section className="bg-background relative isolate flex w-full max-w-xl flex-col overflow-hidden rounded-2xl">
      <style>{rules}</style>
      <div className="flex flex-col gap-2 px-7 pt-8 pb-10">
        <p className="text-muted-foreground font-mono text-[11px] tracking-[0.08em] uppercase">
          Changelog · v2.4
        </p>
        <h3 className="text-foreground text-2xl font-semibold tracking-tight text-balance">
          Exports got smaller
        </h3>
        <p className="text-muted-foreground max-w-sm text-sm text-pretty">
          The band below is four CSS rules and no images. Each one is a 16-pixel
          tile at a lower coverage than the last.
        </p>
      </div>
      <div aria-hidden="true" className="flex flex-col-reverse">
        {BANDS.map((level, index) => (
          <div key={level} className={`export-band-${index} h-6`} />
        ))}
      </div>
    </section>
  );
}
