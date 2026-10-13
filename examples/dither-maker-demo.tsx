import { DitherMaker } from "@/components/dithercn/dither-maker";

const SAMPLES = [
  { name: "Earthrise", src: "/examples/earthrise.jpg" },
  { name: "Aldrin", src: "/examples/aldrin.jpg" },
  { name: "Pillars", src: "/examples/pillars.jpg" },
  { name: "Tetons", src: "/examples/tetons.jpg" },
] as const;

export default function DitherMakerDemo() {
  // The docs column is 42rem. From md up the maker breaks out of it and
  // takes the width between the sidebar and the table of contents.
  return (
    <div className="relative left-1/2 w-full -translate-x-1/2 md:w-[calc(100vw-3rem)] lg:w-[min(80rem,calc(100vw-19rem))] xl:w-[min(80rem,calc(100vw-37rem))]">
      <DitherMaker samples={SAMPLES} />
    </div>
  );
}
