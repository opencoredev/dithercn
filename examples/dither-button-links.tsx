import { DitherButton } from "@/components/dithercn/dither-button";

export default function DitherButtonLinks() {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
      <div className="flex flex-col gap-2">
        <span className="text-2xl font-semibold tracking-tight text-balance">
          Dithered components for your next launch
        </span>
        <span className="text-muted-foreground text-sm">
          Copy them in with the shadcn CLI. Own the code.
        </span>
      </div>
      <div className="flex flex-wrap justify-center gap-3 [--dither-cell:2px]">
        <DitherButton href="/docs/installation">Install dithercn</DitherButton>
        <DitherButton href="/docs/catalog" variant="outline">
          Browse the catalog
        </DitherButton>
      </div>
    </div>
  );
}
