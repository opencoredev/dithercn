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
import { SiteFooter } from "@/components/site-footer";
import { SmoothScroll } from "@/components/smooth-scroll";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";
import { countPieces, getCatalog } from "@/lib/catalog";
import { highlightCode } from "@/lib/highlight-code";
import { BreadcrumbJsonLd } from "@/seo/json-ld";

const H2_CLS =
  "text-[1.75rem] leading-tight font-medium tracking-[-0.03em] sm:text-[2rem]";

/** Entrance order for `.rise-in`, read by its animation-delay. */
const stagger = (order: number): React.CSSProperties & { "--i": number } => ({
  "--i": order,
});

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
      <SmoothScroll />
      <PageTransition>
        <section className="container-wrapper pt-2">
          {/* Always the dark plate, in both site themes. */}
          <div className="dark bg-background text-foreground relative isolate flex min-h-[580px] flex-col items-center overflow-hidden rounded-[24px] border md:min-h-[680px]">
            <DitherHero className="-z-10" />
            <div className="flex w-full max-w-4xl flex-col items-center gap-6 px-5 pt-20 pb-52 text-center md:pt-32 md:pb-64">
              <Link
                href={ROUTES.DOCS_INSTALLATION}
                transitionTypes={["nav-forward"]}
                style={stagger(0)}
                className="rise-in bg-card/80 hover:bg-accent focus-visible:ring-ring/50 inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium backdrop-blur-sm transition-colors duration-150 outline-none focus-visible:ring-[3px]"
              >
                <span className="text-primary font-mono">dither-core</span>
                is out
                <Icon
                  icon={ArrowRight01Icon}
                  className="text-muted-foreground -mr-1 size-3.5"
                />
              </Link>
              <h1
                style={stagger(1)}
                className="rise-in text-[2.6rem] leading-[1.02] font-medium tracking-[-0.045em] text-balance sm:text-6xl lg:text-[4.75rem]"
              >
                Beautiful dithers for landing pages and dashboards.
              </h1>
              <div
                style={stagger(2)}
                className="rise-in flex flex-col items-center gap-2"
              >
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
              <div style={stagger(3)} className="rise-in">
                <HeroActions />
              </div>
            </div>
          </div>
        </section>

        <section
          className="container-wrapper"
          aria-labelledby="catalog-heading"
        >
          <div className="container flex flex-col gap-8 pt-20 pb-10 md:pt-28 md:pb-14">
            <div className="scroll-reveal flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
              <div className="flex flex-col gap-2">
                <h2 id="catalog-heading" className={H2_CLS}>
                  The catalog
                </h2>
                <p className="text-muted-foreground max-w-xl text-pretty">
                  {`${pieceCount === 1 ? "1 component" : `${pieceCount} components`} in ${catalog.length} groups.`}{" "}
                  Each has a live demo, its props and one install command.
                </p>
              </div>
              <Link
                href={ROUTES.DOCS_CATALOG}
                transitionTypes={["nav-forward"]}
                className="group/see text-foreground focus-visible:ring-ring/50 inline-flex items-center gap-1 rounded-full text-sm font-medium outline-none focus-visible:ring-[3px]"
              >
                See the catalog
                <Icon
                  icon={ArrowRight01Icon}
                  className="size-4 transition-transform duration-300 ease-(--ease-out) group-hover/see:translate-x-0.5 motion-reduce:transition-none"
                />
              </Link>
            </div>
            <CatalogTiles catalog={catalog} />
          </div>
        </section>

        <section className="container-wrapper" aria-labelledby="ramp-heading">
          <div className="container py-10 md:py-14">
            <div className="scroll-reveal bg-card flex flex-col gap-8 rounded-[24px] p-5 sm:p-8 md:p-10">
              <h2 id="ramp-heading" className={H2_CLS}>
                How a dither is made
              </h2>
              <BayerRamp />
            </div>
          </div>
        </section>

        <section className="container-wrapper" aria-labelledby="start-heading">
          <div className="container pt-10 pb-20 md:pt-14 md:pb-28">
            <div className="scroll-reveal bg-card grid items-start gap-8 rounded-[24px] p-5 sm:p-8 md:p-10 lg:grid-cols-2 lg:gap-12">
              <div className="flex min-w-0 flex-col gap-4">
                <h2 id="start-heading" className={H2_CLS}>
                  Start with the tokens
                </h2>
                <p className="text-muted-foreground max-w-lg text-pretty">
                  Every component reads three CSS variables, mapped to your
                  theme&apos;s primary and background colours. Install them on
                  their own, or let your first component bring them along.
                </p>
                <CommandBox
                  itemUrl={`${SITE.REGISTRY}/dither-tokens.json`}
                  className="max-w-xl"
                />
              </div>
              <figure
                data-rehype-pretty-code-figure=""
                className="m-0 min-w-0 border [--code:var(--background)] md:mx-0"
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
          </div>
        </section>
      </PageTransition>
      <SiteFooter />
    </>
  );
}
