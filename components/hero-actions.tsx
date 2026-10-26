"use client";

import {
  ArrowRight01Icon,
  Copy01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";

import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useSiteOrigin } from "@/hooks/use-site-origin";
import { quickStartPrompt } from "@/lib/agent-prompts";
import { ditherMaskStyle } from "@/lib/dither";
import { trackEvent } from "@/lib/events";

const COPIED_WASH = ditherMaskStyle(0.25, { cell: 2 });

/**
 * The landing hero's actions: read the docs, or copy a prompt that sets
 * dithercn up through your coding agent.
 */
export const HeroActions = () => {
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  const origin = useSiteOrigin();
  const label = isCopied ? "Prompt copied" : "Copy agent prompt";

  const copyPrompt = async () => {
    const prompt = quickStartPrompt(origin);
    if (await copyToClipboard(prompt)) {
      trackEvent({
        name: "agent_prompt_copied",
        properties: {
          location: "hero",
          prompt_name: "quick-start",
          prompt_text: prompt,
        },
      });
    }
  };

  return (
    <div className="flex flex-col items-center pt-2">
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Button
          asChild
          size="lg"
          // The chevron's glyph sits inside 6px of empty viewBox, so the
          // right padding and the gap are trimmed to balance it optically.
          className="h-11 gap-1 rounded-full pt-px pr-[15.5px] pl-5 text-[0.95rem] has-[>svg]:pr-[15.5px] has-[>svg]:pl-5 motion-safe:active:scale-100"
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
          data-copied={isCopied}
          className="group/copy bg-foreground/[0.04] hover:bg-foreground/[0.08] border-foreground/15 relative isolate h-11 overflow-hidden rounded-full pr-5 pb-px pl-[19px] text-[0.95rem] motion-safe:active:scale-100"
        >
          {/* Stays while it says Copied: the site's ink, as a fine dither. */}
          <span
            aria-hidden="true"
            className="bg-dither-ink absolute inset-0 -z-10 opacity-0 transition-opacity duration-150 ease-out group-data-[copied=true]/copy:opacity-30"
            style={COPIED_WASH}
          />
          {/*
           * Each state is its own icon-and-label group, stacked in one grid
           * cell and centred in it. The resting group is the wider one, so it
           * sets the button's width with no slack, and the copied group sits
           * centred inside that width rather than leaving space on one side.
           * The old icon shrinks away and its label lifts out with a blur
           * while the new ones rise in.
           */}
          <span
            aria-hidden="true"
            className="grid place-items-center *:col-start-1 *:row-start-1"
          >
            <span className="inline-flex items-center gap-2">
              <Icon
                icon={Copy01Icon}
                className="text-muted-foreground transition-[opacity,filter,scale] duration-250 ease-in-out group-data-[copied=true]/copy:scale-25 group-data-[copied=true]/copy:opacity-0 group-data-[copied=true]/copy:blur-[2px] motion-reduce:scale-100! motion-reduce:blur-none! motion-reduce:transition-opacity"
              />
              <span className="transition-[opacity,filter,translate] duration-150 ease-in-out group-data-[copied=true]/copy:-translate-y-1 group-data-[copied=true]/copy:opacity-0 group-data-[copied=true]/copy:blur-[2px] motion-reduce:translate-y-0! motion-reduce:blur-none! motion-reduce:transition-opacity">
                Copy agent prompt
              </span>
            </span>
            <span className="inline-flex items-center gap-2">
              <Icon
                icon={Tick02Icon}
                strokeWidth={2.5}
                className="text-dither-ink scale-25 opacity-0 blur-[2px] transition-[opacity,filter,scale] duration-250 ease-in-out group-data-[copied=true]/copy:scale-100 group-data-[copied=true]/copy:opacity-100 group-data-[copied=true]/copy:blur-none motion-reduce:scale-100! motion-reduce:blur-none! motion-reduce:transition-opacity"
              />
              <span className="translate-y-1 opacity-0 blur-[2px] transition-[opacity,filter,translate] duration-150 ease-in-out group-data-[copied=true]/copy:translate-y-0 group-data-[copied=true]/copy:opacity-100 group-data-[copied=true]/copy:blur-none motion-reduce:translate-y-0! motion-reduce:blur-none! motion-reduce:transition-opacity">
                Prompt copied
              </span>
            </span>
          </span>
        </Button>
      </div>
      <span aria-live="polite" className="sr-only">
        {isCopied ? "Quick start prompt copied" : ""}
      </span>
    </div>
  );
};
