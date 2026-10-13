import { Add01Icon } from "@hugeicons/core-free-icons";

import { EmptyState } from "@/components/dithercn/empty-state";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";

export default function EmptyStateDemo() {
  return (
    <EmptyState
      motif="inbox"
      title="No messages yet"
      description="When someone replies to a thread you follow, it shows up here."
      action={
        <>
          <Button>
            <Icon icon={Add01Icon} />
            New message
          </Button>
          <Button variant="ghost">Notification settings</Button>
        </>
      }
    />
  );
}
