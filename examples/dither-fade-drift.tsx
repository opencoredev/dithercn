import { DitherFade } from "@/components/dithercn/dither-fade";

export default function DitherFadeDrift() {
  return (
    <div className="relative size-full overflow-hidden">
      <div className="bg-primary absolute inset-0" />
      <DitherFade side="top" size="70%" animate matrix="bayer8" cell={4} />
    </div>
  );
}
