import { Suspense } from "react";

import { GithubIcon } from "@/components/icons";
import { LINK } from "@/constants/links";
import { getRepoStars } from "@/lib/github";
import { cn } from "@/lib/utils";

const compact = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  notation: "compact",
});

/** Renders nothing until the repo has stars, or while it's private. */
const StarCount = async () => {
  const stars = await getRepoStars();
  if (stars === null) {
    return null;
  }
  return (
    <span className="font-mono text-xs tabular-nums">
      {compact.format(stars)}
      <span className="sr-only"> stars</span>
    </span>
  );
};

/**
 * The repo link with its live star count. The count streams in on its own,
 * so the header never waits on GitHub, and a failed lookup shows the mark
 * alone.
 */
export const GithubLink = ({
  label,
  className,
}: {
  /** Visible text after the mark, such as "GitHub" in the footer. */
  label?: string;
  className?: string;
}) => (
  <a
    href={LINK.GITHUB_REPO}
    className={cn(
      "text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1.5 rounded-full outline-none transition-colors duration-150 focus-visible:ring-[3px]",
      className
    )}
  >
    <GithubIcon aria-hidden="true" className="size-4 shrink-0" />
    {label ? <span>{label}</span> : <span className="sr-only">GitHub</span>}
    <Suspense fallback={null}>
      <StarCount />
    </Suspense>
  </a>
);
