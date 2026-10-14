"use client";

import {
  ArrowTurnBackwardIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import type { Root as PageTreeRoot } from "fumadocs-core/page-tree";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/icon";
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
import { useIsMac } from "@/hooks/use-is-mac";
import { ditherMaskStyle } from "@/lib/dither";
import { trackEvent } from "@/lib/events";
import { getPagesFromFolder } from "@/lib/page-tree";
import { cn } from "@/lib/utils";

/*
 * Direction: a ⌘K in the site's own voice, after Raycast and Linear. The
 * input is the dialog's top bar, group names are small mono labels like the
 * catalog counts, and the selected row sits on a fine wash of dither ink
 * with its ↵ key. Avoiding:
 * a boxed input inside a box, a chevron on every row, a "Pages" group that
 * repeats the sidebar.
 */

const GROUP_CLS =
  "p-0! [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-3! [&_[cmdk-group-heading]]:pt-4! [&_[cmdk-group-heading]]:pb-1.5! [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[0.7rem] [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:uppercase";

const ITEM_CLS =
  "group/item text-foreground/80 data-[selected=true]:text-foreground relative isolate h-10 gap-3 overflow-hidden rounded-lg px-3! text-[0.9rem] data-[selected=true]:bg-foreground/[0.06]";

// The selected row's wash: dither ink at a fine, even level.
const SELECTED_WASH = ditherMaskStyle(0.25, { cell: 2 });

const KEY_CLS =
  "border-border/80 text-foreground/70 inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-mono text-[0.7rem]";

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
  tree,
  ...props
}: React.ComponentProps<typeof Dialog> & {
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
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex h-9 items-center gap-2 rounded-full px-2.5 text-sm md:pr-2 md:pl-3 outline-none focus-visible:ring-[3px]"
        >
          <Icon icon={Search01Icon} className="size-4" />
          {/* Phones get the icon alone, with the same accessible name. */}
          <span className="max-md:sr-only">Search</span>
          <kbd className={cn(KEY_CLS, "max-md:hidden")}>
            {isMac ? "⌘K" : "Ctrl K"}
          </kbd>
        </button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="bg-popover top-[18vh] translate-y-0 gap-0 overflow-hidden rounded-[20px] p-0 shadow-[0_24px_64px_-16px_rgb(0_0_0/0.5)] sm:max-w-xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search the docs</DialogTitle>
          <DialogDescription>
            Find a docs page or catalog piece.
          </DialogDescription>
        </DialogHeader>
        <Command
          className="rounded-none bg-transparent **:data-[slot=command-input-wrapper]:h-14 **:data-[slot=command-input-wrapper]:gap-3 **:data-[slot=command-input-wrapper]:px-5 **:data-[slot=command-input]:h-14 **:data-[slot=command-input]:text-base"
          filter={handleFilter}
        >
          <CommandInput placeholder="Search pages and components" />
          <CommandList className="no-scrollbar max-h-[min(26rem,55vh)] scroll-pt-10 scroll-pb-2 px-2 pb-2">
            <CommandEmpty className="text-muted-foreground py-14 text-center text-sm">
              Nothing matches that. Try a component name, like waves.
            </CommandEmpty>
            {groups.map((group) => (
              <CommandGroup
                key={group.label}
                heading={group.label}
                className={GROUP_CLS}
              >
                {group.pages.map((page) => (
                  <CommandItem
                    key={page.url}
                    value={`${group.label} ${page.name}`}
                    keywords={[group.label, ...keywordsFromUrl(page.url)]}
                    onSelect={() => go(page.url)}
                    className={ITEM_CLS}
                  >
                    <span
                      aria-hidden="true"
                      className="bg-dither-ink absolute inset-0 -z-10 hidden opacity-30 group-data-[selected=true]/item:block"
                      style={SELECTED_WASH}
                    />
                    <span className="truncate">{page.name}</span>
                    <kbd
                      className={cn(
                        KEY_CLS,
                        "ml-auto hidden group-data-[selected=true]/item:inline-flex"
                      )}
                    >
                      <Icon icon={ArrowTurnBackwardIcon} className="size-3" />
                    </kbd>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
        <div className="text-muted-foreground flex h-11 items-center gap-4 border-t px-5 font-mono text-[0.7rem]">
          <span className="flex items-center gap-1.5">
            <kbd className={KEY_CLS}>↑</kbd>
            <kbd className={KEY_CLS}>↓</kbd>
            move
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className={KEY_CLS}>
              <Icon icon={ArrowTurnBackwardIcon} className="size-3" />
            </kbd>
            open
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className={KEY_CLS}>esc</kbd>
            close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
