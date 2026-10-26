import Link from "next/link";

import { GithubLink } from "@/components/github-link";
import { LogoMark } from "@/components/logo";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";
import { getCatalog } from "@/lib/catalog";
import { fillStyle } from "@/lib/dither";
import { otherOpenCoreSites } from "@/lib/opencore-sites";

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

const SITE_LINKS: readonly FooterLink[] = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
];

const LINK_CLASS =
  "text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-sm text-sm transition-colors duration-150 outline-none focus-visible:ring-[3px]";

// Plain followed links on purpose: they share authority between our sites.
const OPENCORE_SITES = otherOpenCoreSites("https://dithercn.dev");

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
          <Link href={link.href} className={LINK_CLASS}>
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
        <div className="container grid grid-cols-2 gap-x-6 gap-y-10 pt-14 pb-10 md:pt-20 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
          <div className="col-span-2 flex max-w-xs flex-col gap-3 lg:col-span-1">
            <p className="flex items-center gap-2 font-mono text-sm font-medium">
              <LogoMark className="text-primary size-4" />
              {SITE.NAME}
            </p>
            <p className="text-muted-foreground text-sm text-pretty">
              A dither engine with an agent skill, for shadcn projects. MIT
              licensed.
            </p>
            <GithubLink
              label="GitHub"
              location="footer"
              className="w-fit gap-2 text-sm"
            />
          </div>
          <LinkColumn title="Get started" links={START} />
          <LinkColumn title="Examples" links={examples} />
          <LinkColumn title="For agents" links={FOR_AGENTS} />
          <LinkColumn title="dithercn" links={SITE_LINKS} />
          <nav
            aria-labelledby="footer-opencore"
            className="col-span-2 flex flex-col gap-3 lg:col-span-5"
          >
            <h2
              id="footer-opencore"
              className="text-foreground text-sm font-medium"
            >
              More from OpenCore
            </h2>
            <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {OPENCORE_SITES.map((site) => (
                <li key={site.url}>
                  <a href={site.url} className={LINK_CLASS}>
                    <span className="text-foreground">{site.name}</span>{" "}
                    {site.description}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
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
