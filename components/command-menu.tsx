"use client";

import {
  ArrowRight01Icon,
  ArrowTurnBackwardIcon,
} from "@hugeicons/core-free-icons";
import type { Root as PageTreeRoot } from "fumadocs-core/page-tree";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { useIsMac } from "@/hooks/use-is-mac";
import { trackEvent } from "@/lib/events";
import { getPagesFromFolder } from "@/lib/page-tree";

const GROUP_HEADING_CLS =
  "!p-0 [&_[cmdk-group-heading]]:scroll-mt-16 [&_[cmdk-group-heading]]:!p-3 [&_[cmdk-group-heading]]:!pb-1";

const ITEM_CLS =
  "data-[selected=true]:border-input data-[selected=true]:bg-input/50 h-9 rounded-md border border-transparent px-3! font-medium";

const keywordsFromUrl = (url: string) =>
  url
    .split("/")
    .filter(Boolean)
    .flatMap((segment) =>
      segment.includes("-") ? [segment, ...segment.split("-")] : [segment]
    );

const isTypingTarget = (target: EventTarget | null) =>
  (target instanceof HTMLElement && target.isContentEditable) ||
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement;

export const CommandMenu = ({
  navItems,
  tree,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  navItems: { href: string; label: string }[];
  tree: PageTreeRoot;
}) => {
  const router = useRouter();
  const isMac = useIsMac();
  const [open, setOpen] = useState(false);

  const groups = useMemo(
    () =>
      tree.children.flatMap((item) => {
        if (item.type !== "folder") {
          return [];
        }
        const label = typeof item.name === "string" ? item.name : "";
        const pages = getPagesFromFolder(item).map((page) => ({
          name: typeof page.name === "string" ? page.name : "",
          url: page.url,
        }));
        return pages.length > 0 ? [{ label, pages }] : [];
      }),
    [tree]
  );

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const handleFilter = useCallback(
    (value: string, search: string, keywords?: string[]) =>
      `${value} ${keywords?.join(" ") ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
        ? 1
        : 0,
    []
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const isShortcut =
        (e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/";
      if (!isShortcut || isTypingTarget(e.target)) {
        return;
      }

      e.preventDefault();
      setOpen((prev) => {
        if (!prev) {
          trackEvent({
            name: "open_command_menu",
            properties: {
              key: e.key === "/" ? "/" : "mod+k",
              method: "keyboard",
            },
          });
        }
        return !prev;
      });
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen} {...props}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="bg-surface text-muted-foreground dark:bg-card relative h-8 w-full justify-start pl-2.5 font-normal shadow-none sm:pr-12 md:w-40 lg:w-56 xl:w-64"
        >
          <span className="hidden lg:inline-flex">Search documentation…</span>
          <span className="inline-flex lg:hidden">Search…</span>
          <div className="absolute top-1.5 right-1.5 hidden gap-1 sm:flex">
            <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
            <Kbd className="aspect-square">K</Kbd>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="bg-popover ring-border/60 rounded-xl border-none bg-clip-padding p-2 pb-11 shadow-2xl ring-4"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search documentation</DialogTitle>
          <DialogDescription>
            Find a docs page or catalog piece.
          </DialogDescription>
        </DialogHeader>
        <Command
          className="**:data-[slot=command-input-wrapper]:bg-input/50 **:data-[slot=command-input-wrapper]:border-input rounded-none bg-transparent **:data-[slot=command-input]:h-9! **:data-[slot=command-input]:py-0 **:data-[slot=command-input-wrapper]:mb-0 **:data-[slot=command-input-wrapper]:h-9! **:data-[slot=command-input-wrapper]:rounded-md **:data-[slot=command-input-wrapper]:border"
          filter={handleFilter}
        >
          <CommandInput placeholder="Search documentation…" />
          <CommandList className="no-scrollbar min-h-80 scroll-pt-2 scroll-pb-1.5">
            <CommandEmpty className="text-muted-foreground py-12 text-center text-sm">
              No pages match that search.
            </CommandEmpty>
            <CommandGroup heading="Pages" className={GROUP_HEADING_CLS}>
              {navItems.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`Navigation ${item.label}`}
                  keywords={["nav", item.label.toLowerCase()]}
                  onSelect={() => go(item.href)}
                  className={ITEM_CLS}
                >
                  <Icon icon={ArrowRight01Icon} />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {groups.map((group) => (
              <CommandGroup
                key={group.label}
                heading={group.label}
                className={GROUP_HEADING_CLS}
              >
                {group.pages.map((page) => (
                  <CommandItem
                    key={page.url}
                    value={`${group.label} ${page.name}`}
                    keywords={[group.label, ...keywordsFromUrl(page.url)]}
                    onSelect={() => go(page.url)}
                    className={ITEM_CLS}
                  >
                    <Icon icon={ArrowRight01Icon} />
                    {page.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
        <div className="text-muted-foreground bg-muted absolute inset-x-0 bottom-0 z-20 flex h-10 items-center gap-2 rounded-b-xl border-t px-4 text-xs font-medium">
          <Kbd>
            <Icon icon={ArrowTurnBackwardIcon} />
          </Kbd>
          Go to page
        </div>
      </DialogContent>
    </Dialog>
  );
};
