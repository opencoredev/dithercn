import Link from "next/link";

import { BrandContextMenu } from "@/components/brand-context-menu";
import { CommandMenu } from "@/components/command-menu";
import { Wordmark } from "@/components/logo";
import { MainNav } from "@/components/main-nav";
import { MobileNav } from "@/components/mobile-nav";
import { ModeSwitcher } from "@/components/mode-switcher";
import { ROUTES } from "@/constants/routes";
import { source } from "@/lib/source";

const navItems = [
  { href: ROUTES.DOCS, label: "Docs" },
  { href: ROUTES.DOCS_CATALOG, label: "Catalog" },
  { href: ROUTES.DOCS_AI_AGENTS, label: "AI agents" },
];

export const SiteHeader = () => (
  <header
    className="bg-background/90 sticky top-0 z-50 w-full border-b border-dashed backdrop-blur-sm"
    style={{ viewTransitionName: "site-header" }}
  >
    <div className="container-wrapper 3xl:fixed:px-0 px-6">
      <div className="3xl:fixed:container flex h-(--header-height) items-center gap-2">
        <MobileNav
          items={navItems}
          tree={source.pageTree}
          className="flex lg:hidden"
        />
        <BrandContextMenu>
          <Link
            href={ROUTES.HOME}
            transitionTypes={["nav-back"]}
            className="focus-visible:ring-ring/50 flex h-8 items-center rounded-md px-1 outline-none focus-visible:ring-[3px] max-lg:ml-3 lg:mr-4"
          >
            <Wordmark />
          </Link>
        </BrandContextMenu>
        <MainNav items={navItems} className="hidden lg:flex" />
        <div className="ml-auto flex items-center gap-2 md:flex-1 md:justify-end">
          <div className="hidden w-full flex-1 md:flex md:w-auto md:flex-none">
            <CommandMenu navItems={navItems} tree={source.pageTree} />
          </div>
          <ModeSwitcher />
        </div>
      </div>
    </div>
  </header>
);
