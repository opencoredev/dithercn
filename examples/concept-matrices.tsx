import { DitherShader } from "@/lib/dither";
import type { DitherMatrix } from "@/lib/dither";

// A left-to-right ramp: tone equals the horizontal position.
const RAMP = `float field(vec2 uv, vec2 res, float t) { return uv.x; }`;

const MATRICES: { matrix: DitherMatrix; note: string }[] = [
  { matrix: "bayer2", note: "5 tones, coarse crosshatch" },
  { matrix: "bayer4", note: "17 tones, the default" },
  { matrix: "bayer8", note: "65 tones, finer steps" },
  { matrix: "blue-noise", note: "257 tones, no visible grid" },
];

export default function ConceptMatrices() {
  return (
    <div className="flex w-full flex-col gap-4">
      {MATRICES.map(({ matrix, note }) => (
        <figure key={matrix} className="flex flex-col gap-1.5">
          <DitherShader
            field={RAMP}
            matrix={matrix}
            animate={false}
            className="h-12 rounded-lg sm:h-14"
          />
          <figcaption className="flex justify-between gap-4 text-xs">
            <span className="font-mono">{matrix}</span>
            <span className="text-muted-foreground">{note}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
