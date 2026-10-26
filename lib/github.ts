import { z } from "zod";

import { LINK } from "@/constants/links";

const repoSchema = z.object({
  stargazers_count: z.number().int().nonnegative(),
});

/**
 * The repo's star count, refreshed every five minutes. Null while the repo is
 * private (the API answers 404), when GitHub rate-limits or is down, or when
 * the repo has no stars yet, so callers show the link without a number.
 */
export const getRepoStars = async (): Promise<number | null> => {
  try {
    const response = await fetch(LINK.GITHUB_REPO_API, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      return null;
    }
    const parsed = repoSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.stargazers_count === 0) {
      return null;
    }
    return parsed.data.stargazers_count;
  } catch {
    return null;
  }
};
