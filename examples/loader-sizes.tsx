import { Loader } from "@/components/dithercn/loader";
import type { LoaderSize } from "@/components/dithercn/loader";

const SIZES: readonly LoaderSize[] = ["sm", "md", "lg"];

export default function LoaderSizes() {
  return (
    <div className="flex flex-col items-center gap-8">
      {(["ring", "square"] as const).map((variant) => (
        <div key={variant} className="flex items-end gap-10">
          {SIZES.map((size) => (
            <div key={size} className="flex flex-col items-center gap-3">
              <Loader variant={variant} size={size} />
              <span className="text-muted-foreground font-mono text-xs">
                {size}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
