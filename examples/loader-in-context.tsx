import { Loader } from "@/components/dithercn/loader";

export default function LoaderInContext() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div className="bg-background flex items-center gap-3 rounded-2xl border px-4 py-3">
        <Loader size="sm" label="Deploying" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium">Deploying to production</span>
          <span className="text-muted-foreground truncate font-mono text-xs">
            main · 8e52937
          </span>
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">0:42</span>
      </div>
      <div className="bg-background flex flex-col gap-4 rounded-2xl border p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Building preview</span>
          <span className="text-muted-foreground text-xs">Step 3 of 5</span>
        </div>
        <Loader
          variant="bar"
          size="sm"
          label="Building preview"
          className="self-start"
        />
      </div>
      <div className="bg-background text-muted-foreground flex items-center justify-center gap-2.5 rounded-2xl border py-3 text-sm">
        <Loader
          variant="dots"
          size="sm"
          color="--foreground"
          label="Loading more"
        />
        {/* The loader announces this already. */}
        <span aria-hidden="true">Loading more</span>
      </div>
    </div>
  );
}
