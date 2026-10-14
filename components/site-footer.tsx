import Link from "next/link";

import { LogoMark } from "@/components/logo";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";
import { getCatalog } from "@/lib/catalog";
import { fillStyle } from "@/lib/dither";

interface FooterLink {
  href: string;
  label: string;
}

const START: readonly FooterLink[] = [
  { href: ROUTES.DOCS, label: "Introduction" },
  { href: ROUTES.DOCS_INSTALLATION, label: "Installation" },
  { href: ROUTES.DOCS_THEMING, label: "Theming" },
  { href: ROUTES.DOCS_WRITE_YOUR_OWN, label: "Write your own dither" },
];

const FOR_AGENTS: readonly FooterLink[] = [
  { href: ROUTES.AGENT_SKILL, label: "SKILL.md" },
  { href: ROUTES.LLMS, label: "llms.txt" },
  { href: ROUTES.LLMS_FULL, label: "llms-full.txt" },
  { href: ROUTES.REGISTRY, label: "Registry index" },
];

// The closing wordmark: solid along its baseline, thinning upwards.
const WORDMARK_FILL = fillStyle("gradient", {
  edge: "bottom",
  from: 1,
  length: 40,
  to: 0.125,
});

const LinkColumn = ({
  title,
  links,
}: {
  title: string;
  links: readonly FooterLink[];
}) => (
  <nav aria-label={title} className="flex flex-col gap-3">
    <h2 className="text-foreground text-sm font-medium">{title}</h2>
    <ul className="flex flex-col gap-2">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-sm text-sm transition-colors duration-150 outline-none focus-visible:ring-[3px]"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);

export const SiteFooter = () => {
  const examples = getCatalog().map((category) => ({
    href: `${ROUTES.DOCS_EXAMPLES}#catalog-${category.id}`,
    label: category.name,
  }));

  return (
    <footer
      className="overflow-hidden border-t"
      style={{ viewTransitionName: "site-footer" }}
    >
      <div className="container-wrapper">
        <div className="container grid grid-cols-2 gap-x-6 gap-y-10 pt-14 pb-10 md:pt-20 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div className="col-span-2 flex max-w-xs flex-col gap-3 lg:col-span-1">
            <p className="flex items-center gap-2 font-mono text-sm font-medium">
              <LogoMark className="text-primary size-4" />
              {SITE.NAME}
            </p>
            <p className="text-muted-foreground text-sm text-pretty">
              A dither engine with an agent skill, for shadcn projects. MIT
              licensed.
            </p>
          </div>
          <LinkColumn title="Get started" links={START} />
          <LinkColumn title="Examples" links={examples} />
          <LinkColumn title="For agents" links={FOR_AGENTS} />
        </div>
        <div
          aria-hidden="true"
          className="container pb-6 text-[clamp(4.5rem,21vw,19rem)] leading-[0.78] font-medium tracking-[-0.07em] select-none"
        >
          <span
            className="bg-dither-ink block bg-clip-text font-mono text-transparent"
            style={WORDMARK_FILL}
          >
            {SITE.NAME}
          </span>
        </div>
      </div>
    </footer>
  );
};
