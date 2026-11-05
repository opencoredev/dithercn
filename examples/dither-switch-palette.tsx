import { DitherSwitch } from "@/components/dithercn/dither-switch";
import { FILL_VARIANTS } from "@/lib/dither";
import type { DitherColorName } from "@/lib/dither";

const COLORS: readonly DitherColorName[] = ["blue", "green", "orange", "pink"];
const SIZES = ["sm", "md", "lg"] as const;

export default function DitherSwitchPalette() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="grid grid-cols-[auto_repeat(4,auto)] items-center gap-x-4 gap-y-3 sm:gap-x-5">
        {FILL_VARIANTS.map((fill) => (
          <div key={fill} className="contents">
            <span className="text-muted-foreground font-mono text-xs">
              {fill}
            </span>
            {COLORS.map((color) => (
              <DitherSwitch
                key={color}
                aria-label={`${color} ${fill}`}
                defaultChecked
                fill={fill}
                color={color}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-end gap-5">
        {SIZES.map((size) => (
          <div key={size} className="flex flex-col items-center gap-2">
            <DitherSwitch
              aria-label={`Size ${size}`}
              defaultChecked
              size={size}
              color="purple"
            />
            <span className="text-muted-foreground font-mono text-xs">
              {size}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
