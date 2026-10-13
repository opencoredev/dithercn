import Link from "next/link";

import { LogoMark } from "@/components/logo";
import { LINK } from "@/constants/links";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";

export const SiteFooter = () => (
  <footer
    className="border-t border-dashed group-has-[.docs-nav]/body:pb-20 group-has-[.docs-nav]/body:sm:pb-0"
    style={{ viewTransitionName: "site-footer" }}
  >
    <div className="container-wrapper px-4 xl:px-6">
      <div className="text-muted-foreground flex min-h-(--footer-height) flex-col items-start justify-center gap-2 px-1 py-4 text-xs leading-relaxed sm:flex-row sm:items-center sm:justify-between sm:text-sm">
        <p className="flex items-center gap-2">
          <LogoMark className="text-primary size-3.5" />
          {SITE.NAME} is MIT licensed. Built on{" "}
          <a
            href={LINK.STARTERCN}
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline decoration-dotted underline-offset-4 hover:decoration-solid"
          >
            startercn
          </a>
          .
        </p>
        <nav className="flex gap-4" aria-label="Machine-readable docs">
          <Link
            href={ROUTES.LLMS}
            className="hover:text-foreground font-mono transition-colors"
          >
            llms.txt
          </Link>
          <Link
            href={ROUTES.REGISTRY}
            className="hover:text-foreground font-mono transition-colors"
          >
            registry.json
          </Link>
        </nav>
      </div>
    </div>
  </footer>
);
