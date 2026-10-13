import { DitherButton } from "@/components/dithercn/dither-button";
import { FILL_VARIANTS } from "@/lib/dither";
import type { DitherColorName } from "@/lib/dither";

const COLORS: readonly DitherColorName[] = ["blue", "green", "orange", "pink"];

export default function DitherButtonPalette() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {FILL_VARIANTS.map((fill) =>
        COLORS.map((color) => (
          <DitherButton key={`${fill}-${color}`} fill={fill} color={color}>
            {fill}
          </DitherButton>
        ))
      )}
    </div>
  );
}
