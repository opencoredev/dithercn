import Link from "next/link";

import { ROUTES } from "@/constants/routes";
import type { CatalogCategory } from "@/lib/catalog";
import { countPieces } from "@/lib/catalog";

// How many example names each group lists before "and N more".
const NAMED_PIECES = 4;

const PARTS = [
  {
    body: "dither-core installs into lib/dither as plain source you own. It turns a tone between 0 and 1 into dots with Bayer and blue-noise threshold matrices, then draws them three ways: a WebGL shader for anything that moves, SVG patterns and CSS masks for static fills, and a one-off pass for photos and logos. Colours come from your shadcn theme, animation pauses offscreen and respects reduced motion, and any dither exports to PNG, SVG or CSS.",
    title: "The engine",
  },
  {
    body: "A SKILL.md with references that teaches Claude Code, Codex, Cursor, Gemini and other coding agents to use the engine. It walks the agent through picking a technique, writing a field, placing the dither on a landing page or dashboard, colouring it from your theme, and checking it in a browser in light and dark mode at desktop and phone widths.",
    title: "The agent skill",
  },
] as const;

const pieceSummary = (category: CatalogCategory) => {
  const names = category.pieces.slice(0, NAMED_PIECES).map((p) => p.name);
  const rest = category.pieces.length - names.length;
  return rest > 0
    ? `${names.join(", ")} and ${rest} more.`
    : `${names.join(", ")}.`;
};

/**
 * What dithercn is made of, in plain crawlable text: the engine, the skill
 * and every example group. Agents and search engines read the page without
 * running its shaders, so this is the part of the home page they can quote.
 */
export const HomeOverview = ({
  catalog,
  headingClassName,
  leadClassName,
}: {
  catalog: CatalogCategory[];
  headingClassName: string;
  leadClassName: string;
}) => (
  <section className="container-wrapper" aria-labelledby="inside-heading">
    <div className="container flex flex-col gap-12 py-20 md:py-28">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-12">
        <h2 id="inside-heading" className={headingClassName}>
          What's inside.
        </h2>
        <p className={leadClassName}>
          dithercn is an open-source dither engine for shadcn/ui projects, with
          an agent skill that teaches your coding agent to use it. Everything
          installs as code in your repo.
        </p>
      </div>
      <div className="grid gap-x-8 gap-y-10 md:grid-cols-2">
        {PARTS.map((part) => (
          <div key={part.title} className="flex flex-col gap-2 border-t pt-5">
            <h3 className="text-foreground text-lg font-medium">
              {part.title}
            </h3>
            <p className="text-muted-foreground text-pretty">{part.body}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-6">
        <h3 className="text-foreground text-lg font-medium">
          {countPieces(catalog)} examples in {catalog.length} groups
        </h3>
        <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
          {catalog.map((category) => (
            <li
              key={category.id}
              className="flex flex-col gap-1.5 border-t pt-4"
            >
              <Link
                href={`${ROUTES.DOCS_EXAMPLES}#catalog-${category.id}`}
                className="text-foreground focus-visible:ring-ring/50 w-fit rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-[3px]"
              >
                {category.name}{" "}
                <span className="text-muted-foreground font-mono text-xs tabular-nums">
                  {category.pieces.length}
                </span>
              </Link>
              <p className="text-muted-foreground text-sm text-pretty">
                {category.description} {pieceSummary(category)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);
