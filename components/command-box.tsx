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
import { cn } from "@/lib/utils";

const RUNNERS = {
  bun: "bunx --bun",
  npm: "npx",
  pnpm: "pnpm dlx",
  yarn: "yarn dlx",
} as const satisfies Record<PackageManager, string>;

/**
 * `itemUrl` comes from a server component: SITE reads server-only env vars,
 * so computing it here would differ between server and client render.
 */
export const CommandBox = ({
  itemUrl: url,
  className,
}: {
  itemUrl: string;
  className?: string;
}) => {
  const [packageManager, setPackageManager] = usePackageManager();
  const command = `${RUNNERS[packageManager]} shadcn@latest add ${url}`;

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
      <pre className="no-scrollbar overflow-x-auto px-4 py-3.5 pr-12">
        <code className="font-mono text-[0.8rem] whitespace-pre">
          <span className="text-muted-foreground select-none">$ </span>
          <span className="text-muted-foreground">
            {RUNNERS[packageManager]} shadcn@latest add{" "}
          </span>
          <span className="text-foreground">{url}</span>
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
