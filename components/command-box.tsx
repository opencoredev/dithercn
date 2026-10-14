"use client";

import { CopyButton } from "@/components/copy-button";
import { getIconForPackageManager } from "@/components/icons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  isPackageManager,
  PACKAGE_MANAGERS,
  usePackageManager,
} from "@/hooks/use-package-manager";
import type { PackageManager } from "@/hooks/use-package-manager";
import { useSiteOrigin } from "@/hooks/use-site-origin";
import { cn } from "@/lib/utils";

const RUNNERS = {
  bun: "bunx --bun",
  npm: "npx",
  pnpm: "pnpm dlx",
  yarn: "yarn dlx",
} as const satisfies Record<PackageManager, string>;

/** The CLIs the box can run, each with its `add` subcommand. */
const TOOLS = {
  shadcn: "shadcn@latest add",
  skills: "skills add",
} as const;

/**
 * An install command for the reader's package manager. `path` is relative to
 * the site, and the URL uses the address the reader is on, so the command
 * reaches this site wherever it runs.
 */
export const CommandBox = ({
  tool,
  path = "",
  className,
}: {
  tool: keyof typeof TOOLS;
  path?: string;
  className?: string;
}) => {
  const [packageManager, setPackageManager] = usePackageManager();
  const url = `${useSiteOrigin()}${path}`;
  const command = `${RUNNERS[packageManager]} ${TOOLS[tool]} ${url}`;

  return (
    <div
      className={cn(
        "bg-code text-code-foreground relative overflow-hidden rounded-md border text-sm",
        className
      )}
    >
      <Tabs
        className="gap-0"
        value={packageManager}
        onValueChange={(value) => {
          if (isPackageManager(value)) {
            setPackageManager(value);
          }
        }}
      >
        <div className="flex items-center gap-2 border-b px-3 py-1">
          <TabsList className="[&_svg]:text-muted-foreground rounded-none bg-transparent p-0 [&_svg]:me-2 [&_svg]:size-4">
            {getIconForPackageManager(packageManager)}
            {PACKAGE_MANAGERS.map((pm) => (
              <TabsTrigger
                key={pm}
                value={pm}
                className="data-[state=active]:border-input h-7 border border-transparent pt-0.5 font-mono text-xs data-[state=active]:shadow-none"
              >
                {pm}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
      {/* The URL wraps instead of scrolling, so the whole command is always
          readable. On phones it takes its own line. */}
      <pre className="px-4 py-3.5 pr-12 whitespace-normal">
        <code className="font-mono text-[0.8rem] leading-relaxed sm:text-sm">
          <span className="text-muted-foreground whitespace-nowrap select-none">
            ${" "}
          </span>
          <span className="text-muted-foreground whitespace-nowrap">
            {RUNNERS[packageManager]} {TOOLS[tool]}
          </span>{" "}
          <span className="text-foreground block [overflow-wrap:anywhere] sm:inline">
            {url}
          </span>
        </code>
      </pre>
      <CopyButton
        className="absolute top-1.5 right-1.5 z-10 size-7"
        value={command}
        event="copy_npm_command"
      />
    </div>
  );
};
