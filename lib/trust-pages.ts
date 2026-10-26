import { LINK } from "@/constants/links";
import { SITE } from "@/constants/site";

// The About, Contact and Privacy pages. One source renders both the HTML page
// and the Markdown an agent gets with `Accept: text/markdown`, so the two never
// drift. Paragraphs use Markdown links; the HTML page renders them as anchors.

export const CONTACT_EMAIL = "leo@dithercn.dev";

export const TRUST_PAGE_SLUGS = ["about", "contact", "privacy"] as const;
export type TrustPageSlug = (typeof TRUST_PAGE_SLUGS)[number];

export interface TrustSection {
  heading: string;
  paragraphs: readonly string[];
}

export interface TrustPage {
  slug: TrustPageSlug;
  title: string;
  description: string;
  lead: string;
  sections: readonly TrustSection[];
  updated: string;
}

const ISSUES = `${LINK.GITHUB_REPO}/issues`;

export const TRUST_PAGES: Record<TrustPageSlug, TrustPage> = {
  about: {
    description:
      "Who makes dithercn, why it exists, and how the dither engine and agent skill are built and licensed.",
    lead: `${SITE.NAME} is an open-source dither engine for shadcn/ui projects, with an agent skill that teaches your coding agent to use it. Leo builds and maintains it, and it's published by OpenCore, the GitHub organization behind Social SDK, Email SDK and other open-source TypeScript tools.`,
    sections: [
      {
        heading: "What dithercn is",
        paragraphs: [
          "Three parts that work together. `dither-core` is the engine: it installs into `lib/dither` as plain source and turns a tone between 0 and 1 into dots, drawn with WebGL, SVG, CSS masks or a one-off pass for images. The agent skill is a SKILL.md with references that teaches Claude Code, Codex, Cursor and other agents how to build with that engine. The examples, from hero backgrounds to charts, loaders, text effects and dithered photos, show what the engine can make and install with one shadcn command.",
          "Nothing runs on our servers once it's installed. Every file lands in your repo, so you can read it, change it and ship it like the rest of your code.",
        ],
      },
      {
        heading: "Why it exists",
        paragraphs: [
          "Dithering draws a smooth tone with a few colours by placing dots of ink at a matching density. It started as a workaround for limited screens and printers and now reads as a deliberate texture. Most dither effects on the web are one-off shaders that are hard to theme, ignore reduced motion and don't share anything with each other.",
          "dithercn puts one engine under every effect, so a background, a chart fill and a loading state share the same cells, colours and motion rules. Because the skill teaches the engine rather than a fixed list of components, your agent can build a dither nobody has made yet instead of copying the closest example.",
        ],
      },
      {
        heading: "License and credits",
        paragraphs: [
          `dithercn is free and MIT licensed. The source lives at [github.com/opencoredev/dithercn](${LINK.GITHUB_REPO}).`,
          "[Dither Kit](https://www.tripwire.sh/dither-kit) by Boring Software set the bar for this project, and Dither Kit credits [EvilCharts](https://evilcharts.com) for the dithered chart style it grew from. The code and the look here are our own.",
        ],
      },
    ],
    slug: "about",
    title: "About dithercn",
    updated: "2026-10-25",
  },
  contact: {
    description:
      "How to reach the dithercn maintainer about bugs, feature requests, security reports and anything else.",
    lead: "dithercn is maintained by one person, Leo. Where to write depends on what you need, and public questions help the next person too, so start on GitHub when you can.",
    sections: [
      {
        heading: "Bugs and feature requests",
        paragraphs: [
          `Open an issue at [github.com/opencoredev/dithercn/issues](${ISSUES}). For a bug, name the component or engine function, your browser and framework versions, and what you expected to see. A screenshot or a short recording helps most with visual problems, since a dither that looks wrong is easier to show than to describe.`,
          "For a new example or engine feature, describe the page you're building and the effect you want. Requests tied to a real use get built first.",
        ],
      },
      {
        heading: "Email",
        paragraphs: [
          `For anything that shouldn't be public, such as partnerships, press or a private question about your project, email [${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL}). There's no support contract or guaranteed reply time, but every message is read.`,
        ],
      },
      {
        heading: "Security reports",
        paragraphs: [
          `If you find a security problem in the engine, the registry files or this site, email [${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL}) instead of opening a public issue. Include the steps to reproduce it, and you'll get a reply before anything is published.`,
        ],
      },
      {
        heading: "Elsewhere",
        paragraphs: [
          `Leo is [@leoisadev1](${SITE.AUTHOR.URL}) on GitHub. Agents can read this page as Markdown, and the [llms.txt](/llms.txt) index lists every docs page.`,
        ],
      },
    ],
    slug: "contact",
    title: "Contact",
    updated: "2026-10-25",
  },
  privacy: {
    description:
      "What dithercn.dev collects, what it stores in your browser, and who hosts it. No accounts, no ads, no tracking cookies.",
    lead: "dithercn.dev is a documentation site. It has no accounts, no ads and no newsletter, and it collects as little as it can to keep the docs working and learn which pages help.",
    sections: [
      {
        heading: "Analytics",
        paragraphs: [
          "The site uses Vercel Web Analytics to count page views and a few named events, such as copying an install command or the agent prompt. It doesn't set cookies, and it doesn't follow you across other sites or build a profile of you. We see totals, such as how many people opened the installation page, not individuals.",
        ],
      },
      {
        heading: "What's stored in your browser",
        paragraphs: [
          "Local storage remembers your theme, your preferred package manager for install commands, and a few docs display settings. A cookie named `sidebar_state` remembers whether the docs sidebar is open. These stay in your browser, aren't used for tracking and aren't shared with anyone. Clearing your site data removes them.",
        ],
      },
      {
        heading: "Hosting and server logs",
        paragraphs: [
          "Vercel hosts the site. Like any web host, it processes your IP address and request details to serve pages and protect the site from abuse, under the [Vercel privacy policy](https://vercel.com/legal/privacy-policy). The GitHub star count in the header is fetched by our server, so your browser doesn't contact GitHub until you follow the link.",
          "When the shadcn CLI or the skills CLI installs dithercn, it downloads files from this site. Those requests are handled like any other page request, and nothing about your project is sent.",
        ],
      },
      {
        heading: "Questions",
        paragraphs: [
          `Email [${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL}) with any privacy question or request. If this policy changes, the date below changes with it.`,
        ],
      },
    ],
    slug: "privacy",
    title: "Privacy",
    updated: "2026-10-25",
  },
};

export const isTrustPageSlug = (value: string): value is TrustPageSlug =>
  TRUST_PAGE_SLUGS.some((slug) => slug === value);

export const trustPageMarkdown = (page: TrustPage, origin: string): string => {
  const base = origin.replace(/\/$/, "");
  const absolute = (markdown: string) =>
    markdown.replaceAll(/\]\((\/[^)]*)\)/g, `](${base}$1)`);
  const sections = page.sections
    .map(
      (section) =>
        `## ${section.heading}\n\n${section.paragraphs.map(absolute).join("\n\n")}`
    )
    .join("\n\n");

  return `# ${page.title}

> ${page.description}

${absolute(page.lead)}

${sections}

Last updated ${page.updated}. Canonical page: ${base}/${page.slug}
`;
};
