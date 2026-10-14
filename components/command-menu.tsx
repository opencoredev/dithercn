"use client";

import {
  ArrowTurnBackwardIcon,
  BookOpen01Icon,
  GridViewIcon,
  Search01Icon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import Image from "next/image";
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
import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from "@/lib/catalog-preview-size";
import { ditherMaskStyle } from "@/lib/dither";
import { trackEvent } from "@/lib/events";
import type { SearchEntry, SearchGroup } from "@/lib/search-index";
import { cn } from "@/lib/utils";

/*
 * Direction: a component picker, after shadcn's and Raycast's. Every row
 * carries a small print of the component from the catalog, and the pane on
 * the right shows the selected one large with its description, so you see
 * what you'll open before you open it. Docs pages get an icon tile in the
 * same frame. Group names are small mono labels like the catalog counts.
 * Avoiding: bare text rows, a chevron on every row, a patterned highlight,
 * and open or close motion (a keyboard shortcut opens it).
 */

const GROUP_CLS =
  "p-0! [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-3! [&_[cmdk-group-heading]]:pt-4! [&_[cmdk-group-heading]]:pb-1.5! [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[0.7rem] [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:uppercase";

const ITEM_CLS =
  "group/item text-foreground/80 data-[selected=true]:bg-foreground/[0.07] data-[selected=true]:text-foreground h-12 gap-3 rounded-lg px-2! text-[0.9rem]";

const KEY_CLS =
  "border-border/80 text-foreground/70 inline-flex h-5 min-w-5 items-center justify-center rounded border px-1 font-mono text-[0.7rem]";

// Docs pages have no print: their group's icon on a faint dither of the ink.
const PLATE_GRAIN = ditherMaskStyle(0.125, { cell: 2 });

/** Docs pages without a print get their group's icon instead. */
const GROUP_ICONS: Readonly<Record<string, IconSvgElement>> = {
  engine: SourceCodeIcon,
  examples: GridViewIcon,
};

interface Located {
  entry: SearchEntry;
  group: SearchGroup;
}

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

/** The catalog print in both themes, swapped by the `dark` class. */
const Print = ({
  preview,
  sizes,
}: {
  preview: NonNullable<SearchEntry["preview"]>;
  sizes: string;
}) => (
  <>
    <Image
      src={preview.light}
      alt=""
      width={PREVIEW_WIDTH}
      height={PREVIEW_HEIGHT}
      sizes={sizes}
      unoptimized
      className="size-full object-cover dark:hidden"
    />
    <Image
      src={preview.dark}
      alt=""
      width={PREVIEW_WIDTH}
      height={PREVIEW_HEIGHT}
      sizes={sizes}
      unoptimized
      className="hidden size-full object-cover dark:block"
    />
  </>
);

/** A print of the entry, or its group's icon on the same plate. */
const Plate = ({
  located,
  size,
}: {
  located: Located;
  size: "row" | "pane";
}) => {
  const { entry, group } = located;
  return (
    <span
      className={cn(
        "bg-card ring-border/70 relative flex shrink-0 items-center justify-center overflow-hidden ring-1",
        size === "row"
          ? "h-8 w-11 rounded-md"
          : "aspect-[4/3] w-full rounded-xl"
      )}
    >
      {entry.preview ? (
        <Print
          preview={entry.preview}
          sizes={size === "row" ? "44px" : "320px"}
        />
      ) : (
        <>
          <span
            aria-hidden="true"
            className="bg-dither-ink absolute inset-0 opacity-30"
            style={PLATE_GRAIN}
          />
          <Icon
            icon={GROUP_ICONS[group.id] ?? BookOpen01Icon}
            className={cn(
              "text-foreground/80 relative",
              size === "row" ? "size-4" : "size-8"
            )}
          />
        </>
      )}
    </span>
  );
};

// Nothing selected (no matches): no pane, so the list takes the width.
const Pane = ({ located }: { located: Located | undefined }) =>
  located ? (
    <aside
      aria-hidden="true"
      className="hidden w-[42%] shrink-0 flex-col gap-4 border-l p-4 md:flex"
    >
      <Plate located={located} size="pane" />
      <div className="flex flex-col gap-1.5 px-1">
        <span className="text-muted-foreground font-mono text-[0.7rem] tracking-wide uppercase">
          {located.group.label}
        </span>
        <span className="font-medium tracking-[-0.01em]">
          {located.entry.name}
        </span>
        <p className="text-muted-foreground line-clamp-4 text-sm text-pretty">
          {located.entry.description}
        </p>
      </div>
    </aside>
  ) : null;

export const CommandMenu = ({
  groups,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  groups: SearchGroup[];
}) => {
  const router = useRouter();
  const isMac = useIsMac();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");

  const byUrl = useMemo(
    () =>
      new Map(
        groups.flatMap((group) =>
          group.entries.map(
            (entry) => [entry.url, { entry, group }] as [string, Located]
          )
        )
      ),
    [groups]
  );

  // Each opening starts from the first result, not the last selection.
  const changeOpen = useCallback((next: boolean) => {
    setOpen(next);
    setSelected("");
  }, []);

  const go = useCallback(
    (href: string) => {
      changeOpen(false);
      router.push(href);
    },
    [router, changeOpen]
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
      setSelected("");
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
    <Dialog open={open} onOpenChange={changeOpen} {...props}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-keyshortcuts={isMac ? "Meta+K /" : "Control+K /"}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 extend-touch-target flex h-8 items-center gap-2 rounded-full bg-foreground/[0.06] pr-3.5 pl-3 text-sm outline-none focus-visible:ring-[3px] max-md:size-8 max-md:justify-center max-md:p-0"
        >
          <Icon icon={Search01Icon} className="size-4" />
          {/* Phones get the icon alone, with the same accessible name. */}
          <span className="max-md:sr-only">Search</span>
        </button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="bg-popover top-[14vh] translate-y-0 gap-0 overflow-hidden rounded-[20px] p-0 shadow-[0_24px_64px_-16px_rgb(0_0_0/0.5)] duration-0 sm:max-w-3xl"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search the docs</DialogTitle>
          <DialogDescription>
            Find a docs page or a component.
          </DialogDescription>
        </DialogHeader>
        <Command
          value={selected}
          onValueChange={setSelected}
          filter={handleFilter}
          className="rounded-none bg-transparent **:data-[slot=command-input-wrapper]:h-14 **:data-[slot=command-input-wrapper]:gap-3 **:data-[slot=command-input-wrapper]:px-5 **:data-[slot=command-input]:h-14 **:data-[slot=command-input]:text-base"
        >
          <CommandInput placeholder="Search components and docs" />
          <div className="flex h-[min(26rem,58vh)] min-h-0">
            <CommandList className="no-scrollbar max-h-none min-w-0 flex-1 scroll-pt-10 scroll-pb-2 px-2 pb-2">
              <CommandEmpty className="text-muted-foreground py-14 text-center text-sm">
                Nothing matches that. Try a component name, like waves.
              </CommandEmpty>
              {groups.map((group) => (
                <CommandGroup
                  key={group.id}
                  heading={group.label}
                  className={GROUP_CLS}
                >
                  {group.entries.map((entry) => (
                    <CommandItem
                      key={entry.url}
                      value={entry.url}
                      keywords={[
                        entry.name,
                        group.label,
                        ...keywordsFromUrl(entry.url),
                      ]}
                      onSelect={() => go(entry.url)}
                      className={ITEM_CLS}
                    >
                      <Plate located={{ entry, group }} size="row" />
                      <span className="truncate">{entry.name}</span>
                      <kbd
                        className={cn(
                          KEY_CLS,
                          "ml-auto hidden md:group-data-[selected=true]/item:inline-flex"
                        )}
                      >
                        <Icon icon={ArrowTurnBackwardIcon} className="size-3" />
                      </kbd>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
            <Pane located={byUrl.get(selected)} />
          </div>
        </Command>
        <div className="text-muted-foreground flex h-11 items-center gap-4 border-t px-5 font-mono text-[0.7rem] max-md:hidden">
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
