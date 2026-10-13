import { GithubIcon, Mail01Icon } from "@hugeicons/core-free-icons";

import { Divider } from "@/components/dithercn/divider";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";

export default function DividerLabel() {
  return (
    <div className="bg-background flex w-full max-w-sm flex-col gap-5 rounded-2xl border p-6">
      <div className="flex flex-col gap-1">
        <span className="font-semibold tracking-tight">Sign in</span>
        <span className="text-muted-foreground text-sm">
          Pick up where you left off.
        </span>
      </div>
      <Button variant="outline" className="w-full">
        <Icon icon={GithubIcon} />
        Continue with GitHub
      </Button>
      <Divider label="or" />
      <Button className="w-full">
        <Icon icon={Mail01Icon} />
        Continue with email
      </Button>
    </div>
  );
}
