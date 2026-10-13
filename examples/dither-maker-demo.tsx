import { DitherMaker } from "@/components/dithercn/dither-maker";

export default function DitherMakerDemo() {
  // The page column is 42rem; the maker borrows the margins beside it on
  // wide screens so the preview and the controls sit side by side.
  return (
    <div className="lg:-mx-8 min-[87.5rem]:-mx-24">
      <DitherMaker />
    </div>
  );
}
