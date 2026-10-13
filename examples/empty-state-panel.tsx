import { DitherButton } from "@/components/dithercn/dither-button";
import { EmptyState } from "@/components/dithercn/empty-state";

export default function EmptyStatePanel() {
  return (
    <div className="bg-background ring-border w-full max-w-xl overflow-hidden rounded-xl ring-1">
      <div className="border-border flex items-center justify-between border-b px-5 py-3">
        <span className="text-sm font-medium">API keys</span>
        <span className="text-muted-foreground font-mono text-xs">
          0 active
        </span>
      </div>
      <EmptyState
        color="green"
        illustration="folder"
        title="No API keys"
        description="Create a key to call the API from your server. Keys are shown once, so store them somewhere safe."
        action={
          <DitherButton size="sm" color="green">
            Create key
          </DitherButton>
        }
      />
    </div>
  );
}
