import { Key01Icon } from "@hugeicons/core-free-icons";

import { EmptyState } from "@/components/dithercn/empty-state";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";

export default function EmptyStateIcon() {
  return (
    <div className="bg-background w-full max-w-xl overflow-hidden rounded-2xl border">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <span className="text-sm font-medium">API keys</span>
        <span className="text-muted-foreground text-xs">0 active</span>
      </div>
      <EmptyState
        icon={<Icon icon={Key01Icon} />}
        title="No API keys"
        description="Create a key to call the API from your server. Keys are shown once, so store them somewhere safe."
        action={<Button size="sm">Create key</Button>}
      />
    </div>
  );
}
