import { ArrowRight01Icon, Upload01Icon } from "@hugeicons/core-free-icons";

import { DitherButton } from "@/components/dithercn/dither-button";
import type { DitherButtonSize } from "@/components/dithercn/dither-button";
import { Icon } from "@/components/icon";

const SIZES: readonly DitherButtonSize[] = ["sm", "md", "lg"];

export default function DitherButtonSizes() {
  return (
    <div className="flex flex-col items-center gap-4">
      {SIZES.map((size) => (
        <div key={size} className="flex items-center gap-3">
          <DitherButton size={size}>
            <Icon icon={Upload01Icon} />
            Upload
          </DitherButton>
          <DitherButton size={size} variant="outline">
            Continue
            <Icon icon={ArrowRight01Icon} />
          </DitherButton>
          <DitherButton size={size} variant="ghost" disabled>
            Disabled
          </DitherButton>
        </div>
      ))}
    </div>
  );
}
