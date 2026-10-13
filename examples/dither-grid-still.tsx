import { DitherGrid } from "@/components/dithercn/dither-grid";

export default function DitherGridStill() {
  return (
    <DitherGrid
      horizon={0.7}
      columns={18}
      fade={0.2}
      glow={0}
      matrix="blue-noise"
      animate={false}
      className="absolute inset-0"
    />
  );
}
