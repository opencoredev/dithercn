import { Divider } from "@/components/dithercn/divider";

export default function DividerDemo() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Release notes</span>
        <p className="text-muted-foreground text-sm">
          The dither engine now snaps cells to whole device pixels, so every dot
          is the same size on any screen.
        </p>
      </div>
      <Divider />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Breaking changes</span>
        <p className="text-muted-foreground text-sm">
          None. Components built on 0.1 keep working without edits.
        </p>
      </div>
    </div>
  );
}
