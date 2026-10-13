import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

import { NotFound } from "@/components/dithercn/not-found";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";

export default function NotFoundDemo() {
  return (
    <NotFound
      titleAs="h2"
      actions={
        <>
          <Button>
            <Icon icon={ArrowLeft01Icon} />
            Back to home
          </Button>
          <Button variant="ghost">Search the docs</Button>
        </>
      }
    />
  );
}
