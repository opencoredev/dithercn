"use client";

import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import type { HTMLMotionProps, Variants } from "motion/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback } from "react";

import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import type { EventName, EventProperties } from "@/lib/events";
import { pageContext, trackEvent } from "@/lib/events";
import { cn } from "@/lib/utils";

export const motionIconVariants: Variants = {
  animate: { filter: "blur(0px)", opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
  initial: { filter: "blur(2px)", opacity: 0, scale: 0.8 },
};

export const motionIconProps: HTMLMotionProps<"span"> = {
  animate: "animate",
  exit: "exit",
  initial: "initial",
  transition: { duration: 0.15, ease: "easeOut" },
  variants: motionIconVariants,
};

export interface CopyButtonProps extends Omit<
  React.ComponentProps<typeof Button>,
  "value"
> {
  value: string | (() => Promise<string> | string);
  src?: string;
  event?: EventName;
  /** Extra context for the event; the copied text is added for you. */
  eventProperties?: EventProperties;
  showTooltip?: boolean;
}

// Commands and prompts are short and worth reading in full; source code is
// summarised by its length rather than sent whole.
const COPIED_TEXT_KEY: Partial<Record<EventName, string>> = {
  agent_prompt_copied: "prompt_text",
  install_command_copied: "command",
};
const copyProperties = (
  event: EventName,
  text: string,
  extra: EventProperties | undefined
): EventProperties => {
  const key = COPIED_TEXT_KEY[event];
  const copied: EventProperties = key
    ? { [key]: text }
    : { code_length: text.length };
  return { ...pageContext(), ...extra, ...copied };
};

export const CopyButton = ({
  value,
  eventProperties,
  className,
  variant = "ghost",
  event,
  children,
  showTooltip = true,
  ...props
}: CopyButtonProps) => {
  const getValue = useCallback(() => {
    if (typeof value === "function") {
      return value();
    }

    return value;
  }, [value]);

  const { copyToClipboard, isCopied } = useCopyToClipboard({
    timeout: 1000,
  });

  const handleCopy = useCallback(async () => {
    const text = await getValue();
    const hasCopied = await copyToClipboard(text);

    if (hasCopied && event) {
      trackEvent({
        name: event,
        properties: copyProperties(event, text, eventProperties),
      });
    }
  }, [copyToClipboard, event, eventProperties, getValue]);

  const copyButton = (
    <Button
      data-slot="copy-button"
      size={children ? "sm" : "icon"}
      variant={variant}
      className={cn(
        children
          ? ""
          : "bg-code absolute top-3 right-2 z-10 size-7 hover:opacity-100 focus-visible:opacity-100",
        className
      )}
      onClick={handleCopy}
      {...props}
    >
      <span className="sr-only">Copy</span>
      <AnimatePresence mode="popLayout" initial={false}>
        {isCopied ? (
          <motion.span key="done" {...motionIconProps}>
            <Icon icon={Tick02Icon} strokeWidth={3} />
          </motion.span>
        ) : (
          <motion.span key="idle" {...motionIconProps}>
            <Icon icon={Copy01Icon} />
          </motion.span>
        )}
      </AnimatePresence>
      {children}
    </Button>
  );

  if (!showTooltip) {
    return copyButton;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{copyButton}</TooltipTrigger>
      <TooltipContent>
        {isCopied ? "Copied" : "Copy to Clipboard"}
      </TooltipContent>
    </Tooltip>
  );
};
