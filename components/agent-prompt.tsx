"use client";

import { CopyButton } from "@/components/copy-button";
import { useSiteOrigin } from "@/hooks/use-site-origin";
import { AGENT_PROMPTS } from "@/lib/agent-prompts";
import type { AgentPromptName } from "@/lib/agent-prompts";

/**
 * A prompt for a coding agent, shown in full in the docs with a copy button.
 * Its URLs use the address the reader is on, so the agent reaches this site.
 */
export const AgentPrompt = ({ name }: { name: AgentPromptName }) => {
  const prompt = AGENT_PROMPTS[name](useSiteOrigin());

  return (
    <div className="bg-code text-code-foreground relative mt-6 rounded-xl border">
      <pre className="overflow-x-auto p-4 pr-12 font-mono text-[0.8rem] leading-relaxed whitespace-pre-wrap">
        {prompt}
      </pre>
      <CopyButton
        value={prompt}
        event="agent_prompt_copied"
        eventProperties={{ location: `docs:${name}`, prompt_name: name }}
        className="absolute top-3 right-3"
      />
    </div>
  );
};
