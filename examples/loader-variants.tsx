import { Loader } from "@/components/dithercn/loader";
import type { LoaderSize, LoaderVariant } from "@/components/dithercn/loader";

const VARIANTS: readonly LoaderVariant[] = ["ring", "dots", "pulse", "bar"];
const SIZES: readonly LoaderSize[] = ["sm", "md", "lg"];

export default function LoaderVariants() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      {VARIANTS.map((variant) => (
        <div
          key={variant}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <span className="text-muted-foreground w-12 shrink-0 font-mono text-xs">
            {variant}
          </span>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            {SIZES.map((size) => (
              <Loader
                key={size}
                variant={variant}
                size={size}
                label={`Loading, ${variant} ${size}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
