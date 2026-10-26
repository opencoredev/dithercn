import { Fragment } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SITE } from "@/constants/site";
import type { TrustPage } from "@/lib/trust-pages";
import { BreadcrumbJsonLd } from "@/seo/json-ld";

// Matches `[text](href)` links and `code` spans, the only inline Markdown the
// trust pages use.
const INLINE = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`/g;

const LINK_CLS =
  "text-foreground underline decoration-1 underline-offset-4 hover:decoration-2";

const Inline = ({ markdown }: { markdown: string }) => {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of markdown.matchAll(INLINE)) {
    const [whole, text, href, code] = match;
    parts.push(markdown.slice(last, match.index));
    if (code === undefined) {
      parts.push(
        <a key={match.index} href={href} className={LINK_CLS}>
          {text}
        </a>
      );
    } else {
      parts.push(
        <code
          key={match.index}
          className="bg-muted rounded-sm px-1 py-0.5 font-mono text-[0.85em]"
        >
          {code}
        </code>
      );
    }
    last = match.index + whole.length;
  }
  parts.push(markdown.slice(last));
  return parts.map((part, index) => (
    // Parts never reorder, so their position is a stable key.
    // eslint-disable-next-line react/no-array-index-key
    <Fragment key={index}>{part}</Fragment>
  ));
};

/** About, Contact and Privacy share this plain, readable layout. */
export const TrustPageView = ({ page }: { page: TrustPage }) => (
  <>
    <BreadcrumbJsonLd
      items={[
        { name: "Home", path: "/" },
        { name: page.title, path: `/${page.slug}` },
      ]}
    />
    <article className="container-wrapper">
      <div className="container flex max-w-2xl flex-col gap-10 pt-16 pb-24 md:pt-24">
        <header className="flex flex-col gap-4">
          <h1 className="text-4xl leading-[1.05] font-medium tracking-[-0.04em] text-balance sm:text-5xl">
            {page.title}
          </h1>
          <p className="text-muted-foreground text-lg text-pretty">
            <Inline markdown={page.lead} />
          </p>
        </header>
        {page.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-3">
            <h2 className="text-foreground text-xl font-medium tracking-[-0.02em]">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p
                key={paragraph.slice(0, 40)}
                className="text-muted-foreground leading-7 text-pretty"
              >
                <Inline markdown={paragraph} />
              </p>
            ))}
          </section>
        ))}
        <p className="text-muted-foreground border-t pt-6 font-mono text-xs">
          {SITE.NAME} · Last updated {page.updated}
        </p>
      </div>
    </article>
    <SiteFooter />
  </>
);
