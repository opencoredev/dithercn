import { Loader } from "@/components/dithercn/loader";
import type { LoaderVariant } from "@/components/dithercn/loader";

const VARIANTS: readonly LoaderVariant[] = ["ring", "dots", "bar", "square"];

export default function LoaderDemo() {
  return (
    <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
      {VARIANTS.map((variant) => (
        <div
          key={variant}
          className="bg-background flex aspect-square flex-col items-center justify-center gap-5 rounded-2xl border"
        >
          <Loader variant={variant} size={variant === "bar" ? "md" : "lg"} />
          <span className="text-muted-foreground font-mono text-xs">
            {variant}
          </span>
        </div>
      ))}
    </div>
  );
}
