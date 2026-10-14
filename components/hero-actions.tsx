"use client";

import {
  ArrowRight01Icon,
  Copy01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
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
import { trackEvent } from "@/lib/events";
import { cn } from "@/lib/utils";

// The agents the prompt works in, named under the buttons in one quiet line.
const AGENTS = [
  { Icon: ClaudeIcon, name: "Claude Code" },
  { Icon: ChatGptIcon, name: "Codex" },
  { Icon: CursorIcon, name: "Cursor" },
  { Icon: GeminiIcon, name: "Gemini" },
  { Icon: GrokIcon, name: "Grok" },
] as const;

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
    <div className="flex flex-col items-center gap-5 pt-2">
      <div className="flex flex-col items-center gap-3 sm:flex-row">
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
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={copyPrompt}
          aria-label={label}
          className="bg-foreground/[0.04] hover:bg-foreground/[0.08] border-foreground/15 h-11 rounded-full px-5 text-[0.95rem]"
        >
          <span
            aria-hidden="true"
            className="grid size-4 *:col-start-1 *:row-start-1"
          >
            <Icon
              icon={Copy01Icon}
              className={cn("text-muted-foreground", isCopied && "invisible")}
            />
            <Icon
              icon={Tick02Icon}
              strokeWidth={2.5}
              className={cn("text-dither-ink", !isCopied && "invisible")}
            />
          </span>
          {/* Both labels share one grid cell, so the button keeps its width. */}
          <span
            aria-hidden="true"
            className="grid text-left *:col-start-1 *:row-start-1"
          >
            <span className={cn(isCopied && "invisible")}>
              Copy agent prompt
            </span>
            <span className={cn(!isCopied && "invisible")}>
              Copied, now paste it
            </span>
          </span>
        </Button>
      </div>
      <p className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 font-mono text-xs">
        <span>Paste it into</span>
        {AGENTS.map(({ Icon: AgentIcon, name }) => (
          <span key={name} className="inline-flex items-center gap-1.5">
            <AgentIcon aria-hidden="true" className="size-3.5" />
            {name}
          </span>
        ))}
      </p>
      <span aria-live="polite" className="sr-only">
        {isCopied ? "Quick start prompt copied" : ""}
      </span>
    </div>
  );
};
