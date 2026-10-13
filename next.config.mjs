import { createMDX } from "fumadocs-mdx/next";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);

const { LINK } = await jiti.import("./constants/links");
const { ROUTES } = await jiti.import("./constants/routes");

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  experimental: {
    viewTransition: true,
  },
  headers() {
    const link = [
      `<${ROUTES.API_CATALOG}>; rel="api-catalog"`,
      `<${ROUTES.OPENAPI}>; rel="service-desc"`,
      `<${ROUTES.DOCS}>; rel="service-doc"`,
      `<${LINK.SHADCN_MCP_DOCS}>; rel="service-doc"; title="shadcn MCP server"`,
      `<${ROUTES.AGENT_SKILLS_INDEX}>; rel="describedby"`,
    ].join(", ");

    return [{ headers: [{ key: "Link", value: link }], source: ROUTES.HOME }];
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatars.githubusercontent.com",
        protocol: "https",
      },
      {
        hostname: "images.unsplash.com",
        protocol: "https",
      },
    ],
  },
  outputFileTracingIncludes: {
    "/*": ["./registry/**/*", "./skills/**/*", "./content/docs/**/*.mdx"],
  },
  redirects() {
    return [
      {
        destination: `${ROUTES.DOCS}.md`,
        permanent: true,
        source: `${ROUTES.DOCS}.mdx`,
      },
      {
        destination: `${ROUTES.DOCS}/:path*.md`,
        permanent: true,
        source: `${ROUTES.DOCS}/:path*.mdx`,
      },
      {
        destination: ROUTES.AGENT_SKILL,
        permanent: true,
        source: "/.well-known/agent-skills/site-skill.md",
      },
      // Round 3: the agent skill became the centre of the docs.
      {
        destination: ROUTES.DOCS_BUILD_WITH_AGENTS,
        permanent: true,
        source: `${ROUTES.DOCS}/ai-agents`,
      },
      {
        destination: ROUTES.DOCS_EXAMPLES,
        permanent: true,
        source: `${ROUTES.DOCS}/catalog`,
      },
      {
        destination: ROUTES.DOCS_EXAMPLES,
        permanent: true,
        source: `${ROUTES.DOCS}/usage`,
      },
      // Concepts became Engine; the Tools group was folded into it.
      {
        destination: `${ROUTES.DOCS}/engine/:path*`,
        permanent: true,
        source: `${ROUTES.DOCS}/concepts/:path*`,
      },
      {
        destination: `${ROUTES.DOCS}/engine/export`,
        permanent: true,
        source: `${ROUTES.DOCS}/tools/export`,
      },
      {
        destination: `${ROUTES.DOCS}/engine/export`,
        permanent: true,
        source: `${ROUTES.DOCS}/tools/:path*`,
      },
    ];
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
