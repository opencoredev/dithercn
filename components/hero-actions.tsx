"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { Icon } from "@/components/icon";
import {
  ChatGptIcon,
  ClaudeIcon,
  CursorIcon,
  GeminiIcon,
  GrokIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useSiteOrigin } from "@/hooks/use-site-origin";
import { quickStartPrompt } from "@/lib/agent-prompts";
import { ditherMaskStyle } from "@/lib/dither";
import { trackEvent } from "@/lib/events";
import { cn } from "@/lib/utils";

// The agents the prompt works in, drawn in one colour like the rest of the hero.
const AGENT_ICONS = [
  { Icon: ClaudeIcon, name: "Claude" },
  { Icon: ChatGptIcon, name: "ChatGPT" },
  { Icon: CursorIcon, name: "Cursor" },
  { Icon: GeminiIcon, name: "Gemini" },
  { Icon: GrokIcon, name: "Grok" },
] as const;

// A faint even dither across the copy button, so it reads as part of the plate.
const BUTTON_GRAIN = ditherMaskStyle(0.125, { cell: 2 });

/**
 * The landing hero's actions: read the docs, or copy a prompt that sets
 * dithercn up through your coding agent.
 */
export const HeroActions = () => {
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  const origin = useSiteOrigin();
  const label = isCopied ? "Copied, now paste it" : "Copy agent prompt";

  const copyPrompt = async () => {
    if (await copyToClipboard(quickStartPrompt(origin))) {
      trackEvent({ name: "copy_quick_start_prompt" });
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row">
      <Button
        asChild
        size="lg"
        className="h-11 rounded-full px-6 text-[0.95rem]"
      >
        <Link href={ROUTES.DOCS} transitionTypes={["nav-forward"]}>
          Read the docs
          <Icon icon={ArrowRight01Icon} />
        </Link>
      </Button>
      <button
        type="button"
        onClick={copyPrompt}
        aria-label={label}
        className="border-foreground/15 hover:border-foreground/30 focus-visible:ring-ring/60 relative isolate flex h-11 items-center gap-3 overflow-hidden rounded-full border pr-5 pl-4 text-[0.95rem] font-medium outline-none focus-visible:ring-[3px]"
      >
        <span
          aria-hidden="true"
          className="bg-dither-ink absolute inset-0 -z-10 opacity-35"
          style={BUTTON_GRAIN}
        />
        <span
          aria-hidden="true"
          className="text-muted-foreground flex items-center gap-1.5"
        >
          {AGENT_ICONS.map(({ Icon: AgentIcon, name }) => (
            <AgentIcon key={name} className="size-3.5" />
          ))}
        </span>
        {/* Both labels share one grid cell, so the button keeps its width. */}
        <span aria-hidden="true" className="grid text-left whitespace-nowrap">
          <span
            className={cn("col-start-1 row-start-1", isCopied && "invisible")}
          >
            Copy agent prompt
          </span>
          <span
            className={cn("col-start-1 row-start-1", !isCopied && "invisible")}
          >
            Copied, now paste it
          </span>
        </span>
      </button>
      <span aria-live="polite" className="sr-only">
        {isCopied ? "Quick start prompt copied" : ""}
      </span>
    </div>
  );
};
