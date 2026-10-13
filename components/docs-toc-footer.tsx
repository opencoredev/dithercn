import { File01Icon } from "@hugeicons/core-free-icons";

import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

const LINK_CLS =
  "text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-[0.8rem] transition-colors [&_svg]:size-3.5";

export const DocsTocFooter = ({
  markdownUrl,
  className,
}: {
  markdownUrl: string;
  className?: string;
}) => (
  <div className={cn("flex flex-col gap-2", className)}>
    <a href={markdownUrl} className={LINK_CLS}>
      <Icon icon={File01Icon} />
      View as Markdown
    </a>
  </div>
);
