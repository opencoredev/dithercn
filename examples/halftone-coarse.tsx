import { Halftone } from "@/components/dithercn/halftone";

export default function HalftoneCoarse() {
  return (
    <Halftone
      spacing={13}
      rotation={0}
      scale={0.6}
      cell={2}
      className="absolute inset-0"
    />
  );
}
