import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { AgentShowcase } from "@/components/agent-showcase";
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
import { BreadcrumbJsonLd } from "@/seo/json-ld";

const H2_CLS =
  "text-[2.5rem] leading-[1.02] font-medium tracking-[-0.045em] text-balance sm:text-5xl lg:text-[3.75rem]";

const LEAD_CLS = "text-muted-foreground max-w-xl text-lg text-pretty";

const LINK_CLS =
  "group/see text-foreground focus-visible:ring-ring/50 inline-flex w-fit items-center gap-1 rounded-full text-sm font-medium outline-none focus-visible:ring-[3px]";

const LinkArrow = () => (
  <Icon
    icon={ArrowRight01Icon}
    className="size-4 transition-transform duration-200 ease-(--ease-out) group-hover/see:translate-x-0.5 motion-reduce:transition-none"
  />
);

/** Entrance order for `.rise-in`, read by its animation-delay. */
const stagger = (order: number): React.CSSProperties & { "--i": number } => ({
  "--i": order,
});

export const dynamic = "force-static";
export const revalidate = false;

const INSTALLS = [
  ["lib/dither/", "The engine: shader, fills, image dithering, export."],
  [".agents/skills/dithercn/", "The skill, for Codex, Cursor and others."],
  [".claude/skills/dithercn/", "The same skill, for Claude Code."],
  ["globals.css", "--dither-ink, --dither-paper and friends, from your theme."],
] as const;

/** The engine's techniques, as the skill chooses between them. */
const TECHNIQUES = [
  [
    "WebGL fields",
    "Anything that moves or varies per pixel: backgrounds, glows, meters.",
  ],
  ["SVG patterns", "Chart and meter fills that stay crisp at any size."],
  ["CSS masks", "Blocks, bars and skeletons, with no script at all."],
  ["Image dithering", "Photos and logos in your theme's colours, or as files."],
] as const;

export default function IndexPage() {
  const catalog = getCatalog();
  const pieceCount = countPieces(catalog);

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", path: ROUTES.HOME }]} />
      <SmoothScroll />
      <PageTransition>
        <section className="container-wrapper pt-2">
          {/* Always the dark plate, in both site themes. */}
          <div className="dark bg-background text-foreground relative isolate flex min-h-[580px] flex-col items-center overflow-hidden rounded-[24px] border md:min-h-[680px]">
            <DitherHero className="-z-10" />
            <div className="flex w-full max-w-4xl flex-col items-center gap-6 px-5 pt-24 pb-52 text-center md:pt-36 md:pb-64">
              <h1
                style={stagger(0)}
                className="rise-in text-[2.6rem] leading-[1.02] font-medium tracking-[-0.045em] text-balance sm:text-6xl lg:text-[4.75rem]"
              >
                Beautiful dithers for landing pages and dashboards.
              </h1>
              <div
                style={stagger(1)}
                className="rise-in flex flex-col items-center gap-2"
              >
                <p className="text-muted-foreground max-w-xl text-lg text-pretty sm:text-xl">
                  <span className="text-foreground">
                    Any dither, built by your agent.
                  </span>{" "}
                  dithercn is a dither engine with an agent skill. Describe the
                  dither you want and your agent builds it in your shadcn theme.
                </p>
                <HeroUseCases className="text-muted-foreground font-mono text-sm" />
              </div>
              <div style={stagger(2)} className="rise-in">
                <HeroActions />
              </div>
            </div>
          </div>
        </section>

        <section className="container-wrapper" aria-labelledby="ask-heading">
          <div className="container flex flex-col gap-10 pt-24 pb-20 md:pt-36 md:pb-28">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-12">
              <h2 id="ask-heading" className={H2_CLS}>
                Ask for any dither.
              </h2>
              <p className={LEAD_CLS}>
                The skill teaches your agent the engine, so one sentence is
                enough: what it is, where it goes, how it should feel.
              </p>
            </div>
            <AgentShowcase />
          </div>
        </section>

        <section className="container-wrapper" aria-labelledby="engine-heading">
          <div className="container flex flex-col gap-10 py-20 md:py-28">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-12">
              <h2 id="engine-heading" className={H2_CLS}>
                Every dither is a tone and a threshold.
              </h2>
              <div className="flex flex-col gap-4">
                <p className={LEAD_CLS}>
                  Your agent builds on one engine. A field gives each cell a
                  tone, a threshold matrix decides which cells take ink, and
                  your theme picks the colours.
                </p>
                <Link
                  href={ROUTES.DOCS_WRITE_YOUR_OWN}
                  transitionTypes={["nav-forward"]}
                  className={LINK_CLS}
                >
                  Write your own dither
                  <LinkArrow />
                </Link>
              </div>
            </div>
            <BayerRamp />
            <dl className="grid gap-x-8 gap-y-6 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              {TECHNIQUES.map(([name, use]) => (
                <div key={name} className="flex flex-col gap-1.5 border-t pt-4">
                  <dt className="font-medium">{name}</dt>
                  <dd className="text-muted-foreground text-sm text-pretty">
                    {use}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section
          className="container-wrapper"
          aria-labelledby="catalog-heading"
        >
          <div className="container flex flex-col gap-10 py-20 md:py-28">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-12">
              <h2 id="catalog-heading" className={H2_CLS}>
                Start from an example.
              </h2>
              <div className="flex flex-col gap-4">
                <p className={LEAD_CLS}>
                  {`${pieceCount === 1 ? "1 component" : `${pieceCount} components`} in ${catalog.length} groups, all built on the engine.`}{" "}
                  Install one as it is, or hand it to your agent to change.
                </p>
                <Link
                  href={ROUTES.DOCS_EXAMPLES}
                  transitionTypes={["nav-forward"]}
                  className={LINK_CLS}
                >
                  See every example
                  <LinkArrow />
                </Link>
              </div>
            </div>
            <CatalogTiles catalog={catalog} />
          </div>
        </section>

        <section className="container-wrapper" aria-labelledby="start-heading">
          <div className="container flex flex-col items-center gap-10 pt-20 pb-20 text-center md:pt-28 md:pb-28">
            <div className="flex flex-col items-center gap-5">
              <h2 id="start-heading" className={H2_CLS}>
                One command, then ask.
              </h2>
              <p className={LEAD_CLS}>
                Add the engine and the skill to any shadcn project. Your agent
                picks the skill up on its next request.
              </p>
            </div>
            <CommandBox
              itemUrl={`${SITE.REGISTRY}/dithercn-skill.json`}
              className="w-full max-w-3xl text-left"
            />
            <dl className="grid w-full max-w-5xl gap-x-8 gap-y-6 text-left sm:grid-cols-2 lg:grid-cols-4">
              {INSTALLS.map(([path, what]) => (
                <div key={path} className="flex flex-col gap-1.5 border-t pt-4">
                  <dt className="text-foreground font-mono text-sm break-all">
                    {path}
                  </dt>
                  <dd className="text-muted-foreground text-sm text-pretty">
                    {what}
                  </dd>
                </div>
              ))}
            </dl>
            <Link
              href={ROUTES.DOCS_ASK_YOUR_AGENT}
              transitionTypes={["nav-forward"]}
              className={LINK_CLS}
            >
              What to ask your agent
              <LinkArrow />
            </Link>
          </div>
        </section>
      </PageTransition>
      <SiteFooter />
    </>
  );
}
