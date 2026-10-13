import { DitherImage } from "@/components/dithercn/dither-image";
import type { DitherMethod } from "@/lib/dither";

const METHODS: DitherMethod[] = [
  "bayer4",
  "bayer8",
  "blue-noise",
  "floyd-steinberg",
  "atkinson",
  "sierra-lite",
];

export default function DitherImageMethods() {
  return (
    <div className="grid w-full grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
      {METHODS.map((method) => (
        <figure key={method} className="flex flex-col gap-2">
          <DitherImage
            src="/examples/tetons.jpg"
            alt=""
            method={method}
            ratio={5 / 4}
            className="w-full rounded-lg"
          />
          <figcaption className="text-muted-foreground font-mono text-xs">
            {method}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
