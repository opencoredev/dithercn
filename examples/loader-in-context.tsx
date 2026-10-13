import { Loader } from "@/components/dithercn/loader";

export default function LoaderInContext() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <div className="bg-background ring-border flex items-center gap-3 rounded-xl px-4 py-3 ring-1">
        <Loader size="sm" color="blue" label="Deploying" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium">Deploying to production</span>
          <span className="text-muted-foreground truncate font-mono text-xs">
            main · 8e52937
          </span>
        </div>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          0:42
        </span>
      </div>
      <div className="bg-background ring-border flex flex-col gap-3 rounded-xl p-4 ring-1">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Uploading assets</span>
          <span className="text-muted-foreground font-mono text-xs">
            128 of 342
          </span>
        </div>
        <Loader
          variant="bar"
          size="sm"
          color="green"
          label="Uploading assets"
        />
      </div>
      <div className="bg-background ring-border flex flex-col items-center gap-3 rounded-xl px-4 py-8 ring-1">
        <Loader
          variant="pulse"
          size="lg"
          color="purple"
          bloom="low"
          label="Waiting for the first event"
        />
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="text-sm font-medium">Listening for events</span>
          <span className="text-muted-foreground text-xs">
            Send a test webhook to see it here.
          </span>
        </div>
      </div>
    </div>
  );
}
