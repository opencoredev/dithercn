import Link from "next/link";

import { BrandContextMenu } from "@/components/brand-context-menu";
import { CommandMenu } from "@/components/command-menu";
import { Wordmark } from "@/components/logo";
import { MainNav } from "@/components/main-nav";
import { MobileNav } from "@/components/mobile-nav";
import { ModeSwitcher } from "@/components/mode-switcher";
import { ROUTES } from "@/constants/routes";
import { getSearchGroups } from "@/lib/search-index";
import { source } from "@/lib/source";

const navItems = [
  { href: ROUTES.DOCS, label: "Docs" },
  { href: ROUTES.DOCS_EXAMPLES, label: "Examples" },
];

/**
 * A floating pill rather than a full-width bar: the header strip itself is
 * transparent, so the page shows around the pill as it scrolls under it.
 * The strip keeps --header-height so sticky sidebars and anchors still clear it.
 */
export const SiteHeader = () => (
  <header
    className="pointer-events-none sticky top-0 z-50 flex h-(--header-height) w-full items-end px-3 pb-2"
    style={{ viewTransitionName: "site-header" }}
  >
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/90 pointer-events-auto mx-auto flex h-12 w-full max-w-[46rem] items-center gap-2 rounded-full border pr-1.5 pl-4 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.25)] backdrop-blur-md">
      <MobileNav
        items={navItems}
        tree={source.pageTree}
        className="flex lg:hidden"
      />
      <BrandContextMenu>
        <Link
          href={ROUTES.HOME}
          transitionTypes={["nav-back"]}
          className="focus-visible:ring-ring/50 flex h-8 items-center rounded-full px-1 outline-none focus-visible:ring-[3px] max-lg:ml-2 lg:mr-2"
        >
          <Wordmark />
        </Link>
      </BrandContextMenu>
      <MainNav items={navItems} className="hidden lg:flex" />
      <div className="ml-auto flex items-center gap-1.5">
        <CommandMenu groups={getSearchGroups()} />
        <ModeSwitcher />
      </div>
    </div>
  </header>
);
