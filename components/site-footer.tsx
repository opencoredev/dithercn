import { LogoMark } from "@/components/logo";
import { SITE } from "@/constants/site";

export const SiteFooter = () => (
  <footer
    className="border-t group-has-[.docs-nav]/body:pb-20 group-has-[.docs-nav]/body:sm:pb-0"
    style={{ viewTransitionName: "site-footer" }}
  >
    <div className="container-wrapper px-4 xl:px-6">
      <div className="text-muted-foreground flex min-h-(--footer-height) flex-col items-start justify-center gap-2 px-1 py-4 text-xs leading-relaxed sm:flex-row sm:items-center sm:justify-between sm:text-sm">
        <p className="flex items-center gap-2">
          <LogoMark className="text-primary size-3.5" />
          {SITE.NAME} is MIT licensed.
        </p>
      </div>
    </div>
  </footer>
);
