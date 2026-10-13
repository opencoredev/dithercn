"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icon";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

/** `shadcn add` for one or more item URLs, with package-manager tabs. */
export const InstallCommand = ({
  urls,
  className,
}: {
  urls: readonly string[];
  className?: string;
}) => {
  const [packageManager, setPackageManager] = usePackageManager();
  const command = `${RUNNERS[packageManager]} shadcn@latest add ${urls.join(" ")}`;

  return (
    <div
      className={cn(
        "bg-code text-code-foreground relative overflow-hidden rounded-[14px] text-sm",
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
        <TabsList className="h-10 gap-0.5 rounded-none bg-transparent px-2 pt-1.5 pb-0">
          {PACKAGE_MANAGERS.map((pm) => (
            <TabsTrigger
              key={pm}
              value={pm}
              className="text-muted-foreground hover:text-foreground data-[state=active]:bg-background/60 data-[state=active]:text-foreground dark:data-[state=active]:bg-background/60 h-7 flex-none rounded-full border-0 px-2.5 font-mono text-xs transition-colors duration-150 data-[state=active]:shadow-none dark:data-[state=active]:border-0"
            >
              {pm}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="no-scrollbar overflow-x-auto px-4 pt-2.5 pb-3.5 pr-12">
        <code className="font-mono text-[0.8rem] whitespace-nowrap">
          {command}
        </code>
      </div>
      <CopyButton
        value={command}
        event="copy_registry_command"
        className="top-1.5 right-2"
      />
    </div>
  );
};

/** The "Manual" disclosure under an install command. */
export const ManualSteps = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger className="group/manual text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -mx-2 inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-[3px]">
        Manual installation
        <Icon
          icon={ArrowDown01Icon}
          className="size-4 transition-transform duration-200 ease-(--ease-out) group-data-[state=open]/manual:rotate-180 motion-reduce:transition-none"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 motion-reduce:animate-none">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};
