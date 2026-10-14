"use client";

import Link from "next/link";

import {
  ChatGptIcon,
  ClaudeIcon,
  CursorIcon,
  GeminiIcon,
} from "@/components/icons";
import { ROUTES } from "@/constants/routes";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { trackEvent } from "@/lib/events";
import { QUICK_START_PROMPT } from "@/lib/quick-start-prompt";
import { cn } from "@/lib/utils";

// The agents the prompt works in, as small overlapping app tiles.
const AGENTS = [
  { Icon: ClaudeIcon, tile: "bg-[#d97757] text-white" },
  { Icon: ChatGptIcon, tile: "bg-white text-black" },
  { Icon: CursorIcon, tile: "bg-black text-white" },
  { Icon: GeminiIcon, tile: "bg-neutral-800 text-white" },
] as const;

const AgentTiles = () => (
  <span aria-hidden="true" className="flex">
    {AGENTS.map(({ Icon, tile }, index) => (
      <span
        key={tile}
        className={cn(
          "ring-background flex size-7 items-center justify-center rounded-lg ring-2",
          index > 0 && "-ml-2",
          tile
        )}
      >
        <Icon className="size-4" />
      </span>
    ))}
  </span>
);

/**
 * The landing hero's actions: copy a prompt that sets dithercn up through
 * your coding agent, or read the docs first.
 */
export const HeroActions = () => {
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  const copyPrompt = async () => {
    if (await copyToClipboard(QUICK_START_PROMPT)) {
      trackEvent({ name: "copy_quick_start_prompt" });
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 pt-2">
      <button
        type="button"
        onClick={copyPrompt}
        className="bg-card/80 hover:bg-card focus-visible:ring-ring/60 flex h-14 items-center gap-3 rounded-2xl border pr-5 pl-3 text-base font-medium backdrop-blur-sm transition-colors duration-150 outline-none focus-visible:ring-[3px] active:scale-[0.98] motion-reduce:active:scale-100"
      >
        <AgentTiles />
        {/* Both labels share one grid cell, so the button keeps its width. */}
        <span className="grid text-left">
          <span
            className={cn("col-start-1 row-start-1", isCopied && "invisible")}
          >
            Copy quick start prompt
          </span>
          <span
            aria-hidden="true"
            className={cn("col-start-1 row-start-1", !isCopied && "invisible")}
          >
            Copied, now paste it
          </span>
        </span>
      </button>
      <Link
        href={ROUTES.DOCS}
        transitionTypes={["nav-forward"]}
        className="decoration-foreground/40 hover:decoration-foreground focus-visible:ring-ring/60 rounded-sm text-base font-medium underline decoration-1 underline-offset-[6px] transition-colors duration-150 outline-none focus-visible:ring-[3px]"
      >
        Read the docs
      </Link>
      <span aria-live="polite" className="sr-only">
        {isCopied ? "Quick start prompt copied" : ""}
      </span>
    </div>
  );
};
