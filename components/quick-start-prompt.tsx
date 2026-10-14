"use client";

import { CopyButton } from "@/components/copy-button";
import { useSiteOrigin } from "@/hooks/use-site-origin";
import { quickStartPrompt } from "@/lib/quick-start-prompt";

/** The hero's quick start prompt, shown in full in the docs with a copy button. */
export const QuickStartPrompt = () => {
  const prompt = quickStartPrompt(useSiteOrigin());

  return (
    <div className="bg-code text-code-foreground relative mt-6 rounded-xl border">
      <pre className="overflow-x-auto p-4 pr-12 font-mono text-[0.8rem] leading-relaxed whitespace-pre-wrap">
        {prompt}
      </pre>
      <CopyButton
        value={prompt}
        event="copy_quick_start_prompt"
        className="absolute top-3 right-3"
      />
    </div>
  );
};
