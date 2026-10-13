import { Loader } from "@/components/dithercn/loader";
import type { LoaderSize, LoaderVariant } from "@/components/dithercn/loader";

const VARIANTS: readonly LoaderVariant[] = ["ring", "pulse", "grid", "bar"];
const SIZES: readonly LoaderSize[] = ["sm", "md", "lg"];

export default function LoaderVariants() {
  return (
    <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-x-8 gap-y-6">
      <span />
      {SIZES.map((size) => (
        <span
          key={size}
          className="text-muted-foreground text-center font-mono text-xs"
        >
          {size}
        </span>
      ))}
      {VARIANTS.map((variant) => (
        <div key={variant} className="contents">
          <span className="text-muted-foreground font-mono text-xs">
            {variant}
          </span>
          {SIZES.map((size) => (
            <Loader
              key={size}
              variant={variant}
              size={size}
              label={`Loading, ${variant} ${size}`}
              className="justify-self-center"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
