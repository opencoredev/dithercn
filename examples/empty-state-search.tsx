import { Search01Icon } from "@hugeicons/core-free-icons";

import { DitherButton } from "@/components/dithercn/dither-button";
import { EmptyState } from "@/components/dithercn/empty-state";
import { Icon } from "@/components/icon";

export default function EmptyStateSearch() {
  return (
    <div className="bg-background ring-border w-full max-w-md overflow-hidden rounded-xl ring-1">
      <div className="border-border flex items-center gap-2 border-b px-4 py-3">
        <Icon icon={Search01Icon} className="text-muted-foreground size-4" />
        <span className="font-mono text-sm">ditehr</span>
      </div>
      <EmptyState
        illustration="search"
        color="grey"
        title="No results for “ditehr”"
        description="Check the spelling, or search for a shorter phrase."
        action={
          <DitherButton size="sm" variant="outline" color="grey">
            Clear search
          </DitherButton>
        }
        className="py-8"
      />
    </div>
  );
}
