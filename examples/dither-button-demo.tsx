import { DitherButton } from "@/components/dithercn/dither-button";

export default function DitherButtonDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <DitherButton size="lg">Get started</DitherButton>
      <DitherButton size="lg" variant="outline">
        View on GitHub
      </DitherButton>
      <DitherButton size="lg" variant="ghost">
        Read the docs
      </DitherButton>
    </div>
  );
}
