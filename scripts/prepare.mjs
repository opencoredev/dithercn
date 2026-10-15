/**
 * Installs the lefthook git hooks, unless there's no git checkout to put them
 * in. Vercel builds from an upload without .git, where `lefthook install`
 * exits 128 and takes `pnpm install` down with it.
 *
 * Runs as the `prepare` script. Plain Node so it behaves the same on every OS.
 */

import { spawnSync } from "node:child_process";

const git = spawnSync("git", ["rev-parse", "--git-dir"], { stdio: "ignore" });
if (git.status === 0) {
  const lefthook = spawnSync("lefthook", ["install"], {
    shell: true,
    stdio: "inherit",
  });
  process.exit(lefthook.status ?? 1);
}
