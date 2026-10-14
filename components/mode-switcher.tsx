"use client";

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";

import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useThemeToggle } from "@/hooks/use-theme-toggle";

/**
 * Shows the theme a click switches to: a moon in light mode, a sun in dark.
 * Both icons render and the `dark` class picks one, so the server and the
 * browser draw the same markup before the theme is known.
 */
export const ModeSwitcher = () => {
  const { toggleTheme } = useThemeToggle();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground extend-touch-target size-8 rounded-full hover:bg-transparent dark:hover:bg-transparent"
          aria-keyshortcuts="D"
          onClick={toggleTheme}
        >
          <Icon icon={Moon02Icon} className="size-4 dark:hidden" />
          <Icon icon={Sun03Icon} className="hidden size-4 dark:block" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent className="pr-2 pl-3">
        <div className="flex items-center gap-3">
          Toggle theme
          <Kbd>D</Kbd>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
