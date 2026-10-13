"use client";

import { DitherGradient } from "@/components/dithercn/dither-gradient";
import type { GradientShape } from "@/components/dithercn/dither-gradient";
import { usePreviewValue } from "@/components/preview-controls";
import { ditherGradientControls as knobs } from "@/examples/dither-gradient-controls";

export default function DitherGradientDemo() {
  const mode = usePreviewValue(knobs.mode);
  const color = usePreviewValue(knobs.color);
  const matrix = usePreviewValue(knobs.matrix);
  const cell = usePreviewValue(knobs.cell);
  const to = usePreviewValue(knobs.to);
  const noise = usePreviewValue(knobs.noise);
  const animate = usePreviewValue(knobs.animate);

  const shape: GradientShape =
    mode === "radial"
      ? { center: [0.5, 1], mode, radius: 0.8 }
      : { angle: mode === "linear" ? 160 : 210, mode };

  return (
    <DitherGradient
      {...shape}
      palette={["--dither-paper", color]}
      matrix={matrix}
      cell={cell}
      // Radial glows out from the centre: ink there, paper at the rim.
      from={mode === "radial" ? to : 0}
      to={mode === "radial" ? 0 : to}
      noise={noise}
      animate={animate}
      className="absolute inset-0"
    />
  );
}
