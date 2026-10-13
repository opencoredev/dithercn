"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Arrows nudge 2px toward the destination on hover, on hover-capable devices.
const NUDGE_CLS =
  "transition-transform duration-150 ease-(--ease-out) motion-reduce:transition-none";

export const DocsNavLink = ({
  href,
  children,
  className,
  tooltip,
  transitionTypes,
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button> & {
  href: string;
  children: React.ReactNode;
  className?: string;
  tooltip?: { title: string; icon: React.ReactNode };
  transitionTypes?: string[];
}) => {
  const isBack = transitionTypes?.includes("nav-back") ?? false;
  const isForward = transitionTypes?.includes("nav-forward") ?? false;

  const link = (
    <Button
      variant="secondary"
      size={size}
      className={cn("group/nav shadow-none", className)}
      asChild
      {...props}
    >
      <Link href={href} transitionTypes={transitionTypes}>
        {isBack && (
          <Icon
            icon={ArrowLeft01Icon}
            className={cn(
              NUDGE_CLS,
              "[@media(hover:hover)]:group-hover/nav:-translate-x-0.5"
            )}
          />
        )}
        {children}
        {isForward && (
          <Icon
            icon={ArrowRight01Icon}
            className={cn(
              NUDGE_CLS,
              "[@media(hover:hover)]:group-hover/nav:translate-x-0.5"
            )}
          />
        )}
      </Link>
    </Button>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent className="pr-2 pl-3">
          <div className="flex items-center gap-3">
            {tooltip.title}
            {tooltip.icon && <Kbd>{tooltip.icon}</Kbd>}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
};
