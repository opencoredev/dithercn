import { DitherImage } from "@/components/dithercn/dither-image";

export default function DitherImageCover() {
  return (
    <article className="bg-background w-full max-w-sm overflow-hidden rounded-2xl border">
      <DitherImage
        src="/examples/tetons.jpg"
        alt="The Grand Teton range above a bend in the Snake River"
        method="bayer8"
        cell={3}
        ratio={4 / 3}
        className="w-full [--dither-paper:var(--background)]"
      />
      <div className="flex flex-col gap-1.5 p-5">
        <span className="text-muted-foreground font-mono text-xs">
          Field notes, 6 min read
        </span>
        <h3 className="text-lg font-medium tracking-tight text-balance">
          Ansel Adams at the Snake River, 1942
        </h3>
      </div>
    </article>
  );
}
