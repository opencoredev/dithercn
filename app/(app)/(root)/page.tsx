import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { AgentShowcase } from "@/components/agent-showcase";
import { CommandBox } from "@/components/command-box";
import { DitherHero } from "@/components/dither-hero";
import { ExampleGallery } from "@/components/example-gallery";
import { HeroActions } from "@/components/hero-actions";
import { HomeOverview } from "@/components/home-overview";
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
  [
    ".agents/skills/dithercn/",
    "The skill, for Codex, Cursor, Gemini and others.",
  ],
  [".claude/skills/dithercn/", "The same skill, for Claude Code."],
  [
    "lib/dither/",
    "The engine, added by your agent the first time it builds a dither.",
  ],
  ["globals.css", "--dither-ink, --dither-paper and friends, from your theme."],
] as const;

export default function IndexPage() {
  const catalog = getCatalog();
  const pieceCount = countPieces(catalog);

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", path: ROUTES.HOME }]} />
      <SmoothScroll />
      <PageTransition>
        {/*
         * Pulled up under the sticky header, so the nav pill floats on the
         * plate. The plate runs to the bottom of the first screen and stops
         * square there, so the planet's arc sits on the section's edge.
         */}
        <section className="container-wrapper -mt-(--header-height) pt-2">
          {/* Always the dark plate, in both site themes. */}
          <div className="dark bg-background text-foreground relative isolate flex min-h-[max(600px,calc(100svh-0.5rem))] flex-col items-center justify-center overflow-hidden rounded-t-[24px] border border-b-0">
            <DitherHero className="-z-10" />
            <div className="flex w-full max-w-4xl flex-col items-center gap-6 px-5 pt-36 pb-64 text-center md:pt-48 md:pb-64">
              <h1
                style={stagger(0)}
                className="rise-in text-[2.6rem] leading-[1.02] font-medium tracking-[-0.045em] text-balance sm:text-6xl lg:text-[4.75rem]"
              >
                Add dithers to anything in your app.
              </h1>
              <p
                style={stagger(1)}
                className="rise-in text-muted-foreground max-w-xl text-lg text-balance sm:text-xl"
              >
                Dithered shaders and UI for shadcn/ui. One prompt for your
                coding agent.
              </p>
              <div style={stagger(2)} className="rise-in">
                <HeroActions />
              </div>
            </div>
          </div>
        </section>

        <section
          className="container-wrapper"
          aria-labelledby="catalog-heading"
        >
          <div className="container flex flex-col gap-10 pt-24 pb-20 md:pt-36 md:pb-28">
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
                  See all {pieceCount} in the catalog
                  <LinkArrow />
                </Link>
              </div>
            </div>
            <ExampleGallery catalog={catalog} />
          </div>
        </section>

        <section className="container-wrapper" aria-labelledby="ask-heading">
          <div className="container flex flex-col gap-10 py-20 md:py-28">
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

        <HomeOverview
          catalog={catalog}
          headingClassName={H2_CLS}
          leadClassName={LEAD_CLS}
        />

        <section className="container-wrapper" aria-labelledby="start-heading">
          <div className="container flex flex-col items-center gap-10 pt-20 pb-20 text-center md:pt-28 md:pb-28">
            <div className="flex flex-col items-center gap-5">
              <h2 id="start-heading" className={H2_CLS}>
                One command, then ask.
              </h2>
              <p className={LEAD_CLS}>
                Add the skill with the skills CLI, for Claude Code, Codex,
                Cursor or any other agent. Your agent adds the engine the first
                time it builds a dither.
              </p>
            </div>
            <CommandBox tool="skills" className="w-full max-w-3xl text-left" />
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
            <p className="text-muted-foreground max-w-xl text-sm text-pretty">
              Using shadcn?{" "}
              <code className="text-foreground font-mono text-[0.8rem] break-all">
                npx shadcn@latest add {SITE.REGISTRY}/dithercn-skill.json
              </code>{" "}
              installs the skill and the engine together.{" "}
              <Link
                href={ROUTES.DOCS_INSTALLATION}
                transitionTypes={["nav-forward"]}
                className="text-foreground underline decoration-1 underline-offset-4"
              >
                Installation
              </Link>{" "}
              has both commands.
            </p>
          </div>
        </section>
      </PageTransition>
      <SiteFooter />
    </>
  );
}
