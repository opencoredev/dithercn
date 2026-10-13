import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { BayerRamp } from "@/components/bayer-ramp";
import { CatalogTiles } from "@/components/catalog-tiles";
import { CommandBox } from "@/components/command-box";
import { DitherHero } from "@/components/dither-hero";
import { HeroActions } from "@/components/hero-actions";
import { HeroUseCases } from "@/components/hero-use-cases";
import { Icon } from "@/components/icon";
import { PageTransition } from "@/components/page-transition";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";
import { countPieces, getCatalog } from "@/lib/catalog";
import { highlightCode } from "@/lib/highlight-code";
import { BreadcrumbJsonLd } from "@/seo/json-ld";

export const dynamic = "force-static";
export const revalidate = false;

const TOKENS_SNIPPET = `:root {
  --dither-ink: var(--primary);
  --dither-paper: var(--background);
  --dither-cell: 3px;
}`;

export default async function IndexPage() {
  const catalog = getCatalog();
  const pieceCount = countPieces(catalog);
  const tokensHtml = await highlightCode(TOKENS_SNIPPET, "css");

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", path: ROUTES.HOME }]} />
      <PageTransition>
        <section className="container-wrapper pt-2">
          {/* Always the dark plate, in both site themes. */}
          <div className="dark bg-background text-foreground relative isolate flex border min-h-[560px] flex-col items-center overflow-hidden rounded-2xl md:min-h-[640px]">
            <DitherHero className="-z-10" />
            <div className="flex w-full max-w-4xl flex-col items-center gap-6 px-5 pt-20 pb-52 text-center md:pt-28 md:pb-60">
              <Link
                href={ROUTES.DOCS_INSTALLATION}
                transitionTypes={["nav-forward"]}
                className="bg-card/80 hover:bg-accent focus-visible:ring-ring/50 inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium backdrop-blur-sm transition-colors duration-150 outline-none focus-visible:ring-[3px]"
              >
                <span className="text-primary font-mono">dither-tokens</span>
                is out
                <Icon
                  icon={ArrowRight01Icon}
                  className="text-muted-foreground -mr-1 size-3.5"
                />
              </Link>
              <h1 className="text-[2.5rem] leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-6xl lg:text-7xl">
                Beautiful dithers for landing pages and dashboards.
              </h1>
              <div className="flex flex-col items-center gap-2">
                <p className="text-muted-foreground max-w-xl text-lg text-pretty sm:text-xl">
                  Dithered backgrounds, charts and interface pieces that follow
                  your shadcn theme, installed with{" "}
                  <code className="text-foreground font-mono text-[0.9em] whitespace-nowrap">
                    npx shadcn add
                  </code>
                  .
                </p>
                {/* Fixed width for the rotating word so "Made for" never shifts. */}
                <HeroUseCases className="text-muted-foreground font-mono text-sm [&_[aria-hidden]>span]:min-w-[16ch] [&_[aria-hidden]>span]:text-left" />
              </div>
              <HeroActions />
            </div>
          </div>
        </section>

        <section
          className="container-wrapper"
          aria-labelledby="catalog-heading"
        >
          <div className="container flex flex-col gap-8 py-14 md:py-20">
            <div className="flex flex-col gap-2">
              <h2
                id="catalog-heading"
                className="text-2xl font-semibold tracking-tight"
              >
                What&apos;s coming
              </h2>
              <p className="text-muted-foreground max-w-xl text-pretty">
                {`${pieceCount} pieces in ${catalog.length} groups.`} None has
                shipped yet; each has a page that says what it will do.
              </p>
            </div>
            <CatalogTiles catalog={catalog} />
          </div>
        </section>

        <section
          className="container-wrapper border-t border-dashed"
          aria-labelledby="ramp-heading"
        >
          <div className="container flex flex-col gap-8 py-14 md:py-20">
            <h2
              id="ramp-heading"
              className="text-2xl font-semibold tracking-tight"
            >
              How a dither is made
            </h2>
            <BayerRamp />
          </div>
        </section>

        <section
          className="container-wrapper border-t border-dashed"
          aria-labelledby="start-heading"
        >
          <div className="container grid items-start gap-10 py-14 md:py-20 lg:grid-cols-2 lg:gap-12">
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
            <figure
              data-rehype-pretty-code-figure=""
              className="m-0 min-w-0 border md:mx-0"
            >
              <figcaption
                data-rehype-pretty-code-title=""
                className="text-code-foreground"
              >
                globals.css
              </figcaption>
              <div dangerouslySetInnerHTML={{ __html: tokensHtml }} />
            </figure>
          </div>
        </section>
      </PageTransition>
    </>
  );
}
