import Link from "next/link";

import { BayerRamp } from "@/components/bayer-ramp";
import { CatalogIndex } from "@/components/catalog-index";
import { CommandBox } from "@/components/command-box";
import { HeroUseCases } from "@/components/hero-use-cases";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";
import { countPieces, getCatalog } from "@/lib/catalog";
import { BreadcrumbJsonLd } from "@/seo/json-ld";

export const dynamic = "force-static";
export const revalidate = false;

const AGENT_LINKS = [
  { href: ROUTES.LLMS, label: "llms.txt", note: "Index of every page" },
  {
    href: ROUTES.AGENT_SKILLS_SITE_SKILL,
    label: "site-skill.md",
    note: "Agent skill",
  },
  { href: ROUTES.REGISTRY, label: "registry.json", note: "shadcn registry" },
  {
    href: `${ROUTES.DOCS_INSTALLATION}.md`,
    label: "installation.md",
    note: "Any page as Markdown",
  },
] as const;

export default function IndexPage() {
  const catalog = getCatalog();
  const pieceCount = countPieces(catalog);

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", path: ROUTES.HOME }]} />
      <PageTransition>
        <section className="container-wrapper">
          <div className="container flex flex-col gap-8 pt-14 pb-12 md:pt-24 md:pb-16">
            <h1 className="max-w-4xl text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-6xl lg:text-7xl">
              Beautiful dithers for landing pages and dashboards.
            </h1>
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground max-w-xl text-lg text-pretty sm:text-xl">
                Dithered backgrounds, charts and interface pieces that follow
                your shadcn theme, installed with{" "}
                <code className="text-foreground font-mono text-[0.9em]">
                  npx shadcn add
                </code>
                .
              </p>
              <HeroUseCases className="text-muted-foreground font-mono text-sm" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href={ROUTES.DOCS} transitionTypes={["nav-forward"]}>
                  Read the docs
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link
                  href={ROUTES.DOCS_CATALOG}
                  transitionTypes={["nav-forward"]}
                >
                  Browse the catalog
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container-wrapper">
          <div className="container pb-16 md:pb-24">
            <BayerRamp />
          </div>
        </section>

        <section
          className="container-wrapper border-t border-dashed"
          aria-labelledby="catalog-heading"
        >
          <div className="container grid gap-10 py-14 md:py-20 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
            <div className="flex flex-col gap-3">
              <h2
                id="catalog-heading"
                className="text-2xl font-semibold tracking-tight"
              >
                What&apos;s coming
              </h2>
              <p className="text-muted-foreground text-pretty">
                {`${pieceCount} pieces in ${catalog.length} groups.`} None has
                shipped yet. Each one already has a page that says what
                it&apos;s for and what it will do.
              </p>
            </div>
            <CatalogIndex variant="compact" />
          </div>
        </section>

        <section
          className="container-wrapper border-t border-dashed"
          aria-labelledby="start-heading"
        >
          <div className="container grid gap-12 py-14 md:py-20 lg:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-4">
              <h2
                id="start-heading"
                className="text-2xl font-semibold tracking-tight"
              >
                Start with the tokens
              </h2>
              <p className="text-muted-foreground max-w-lg text-pretty">
                One item ships today: the CSS variables every piece will read,
                mapped to your theme&apos;s primary and background colours.
              </p>
              <CommandBox
                itemUrl={`${SITE.REGISTRY}/dither-tokens.json`}
                className="max-w-xl"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <h2 className="text-2xl font-semibold tracking-tight">
                Readable by agents
              </h2>
              <p className="text-muted-foreground max-w-lg text-pretty">
                Every page has a Markdown version, and the site publishes an
                agent skill and an API catalog.{" "}
                <Link
                  href={ROUTES.DOCS_AI_AGENTS}
                  className="text-foreground underline decoration-dotted underline-offset-4 hover:decoration-solid"
                >
                  How agents use dithercn
                </Link>
              </p>
              <ul className="grid max-w-xl gap-px overflow-hidden rounded-md border sm:grid-cols-2">
                {AGENT_LINKS.map((link) => (
                  <li key={link.href} className="bg-card">
                    <a
                      href={link.href}
                      className="hover:bg-accent/60 focus-visible:ring-ring/50 flex h-full flex-col gap-0.5 px-4 py-3 outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
                    >
                      <span className="font-mono text-sm">{link.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {link.note}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </PageTransition>
    </>
  );
}
