import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

import { ROUTES } from "@/constants/routes";
import { markdownNotFound } from "@/lib/agent-discovery/markdown-404";
import { problemResponse } from "@/lib/agent-discovery/problem";
import {
  API_VERSION,
  API_VERSION_HEADER,
} from "@/lib/agent-discovery/status-api";
import { capture, serverEventFor } from "@/lib/analytics/server-capture";
import { docsContentRoute, homeContentRoute } from "@/lib/docs";
import { isTrustPageSlug } from "@/lib/trust-pages";

const { rewrite: rewriteDocs } = rewritePath(
  `${ROUTES.DOCS}{/*path}`,
  `${docsContentRoute}{/*path}/content.md`
);
const { rewrite: rewriteSuffix } = rewritePath(
  `${ROUTES.DOCS}{/*path}.md`,
  `${docsContentRoute}{/*path}/content.md`
);

// Paths that are files, APIs or machine endpoints, never pages, so a
// Markdown request for them is left to their own route.
const NON_PAGE_PREFIXES = [
  "/_next/",
  "/api/",
  "/r/",
  "/.well-known/",
  "/og",
  `${ROUTES.LLMS_MD}/`,
  "/catalog-capture",
  "/ingest",
] as const;

// Machine-readable surfaces that advertise the request budget agents should
// keep to. The numbers document a policy; Vercel's platform limits enforce it.
const RATE_LIMITED_PREFIXES = ["/api/", "/r/", "/.well-known/"] as const;
const RATE_LIMIT_HEADERS = {
  "RateLimit-Limit": "1000",
  "RateLimit-Policy": "1000;w=60",
  "RateLimit-Remaining": "999",
  "RateLimit-Reset": "60",
  "X-RateLimit-Limit": "1000",
  "X-RateLimit-Remaining": "999",
  "X-RateLimit-Reset": "60",
} as const;

const PAGE_VARY =
  "Accept, rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch";

const hasFileExtension = (pathname: string) => /\.[a-z0-9]+$/i.test(pathname);

const isPagePath = (pathname: string) =>
  !hasFileExtension(pathname) &&
  !NON_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const isRateLimited = (pathname: string) =>
  pathname === ROUTES.OPENAPI ||
  RATE_LIMITED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

/** `/about` or `/about.md` to the trust page's slug, if it is one. */
const trustSlug = (pathname: string) => {
  const slug = pathname.slice(1).replace(/\.md$/, "");
  return isTrustPageSlug(slug) ? slug : undefined;
};

// Every operation in /openapi.json takes X-API-Version, so every documented
// path rejects a version it doesn't serve instead of silently ignoring it.
const isVersionedApiPath = (pathname: string) =>
  isRateLimited(pathname) ||
  pathname === ROUTES.LLMS ||
  pathname === ROUTES.LLMS_FULL ||
  pathname === homeContentRoute;

const isUnsupportedVersion = (requested: string | null) =>
  requested !== null && requested.trim() !== API_VERSION;

const unsupportedVersion = (request: NextRequest, requested: string) =>
  problemResponse({
    code: "unsupported_api_version",
    detail: `${API_VERSION_HEADER} "${requested}" is not supported. The only version is ${API_VERSION}.`,
    origin: request.nextUrl.origin,
    request,
    resolution: `Send ${API_VERSION_HEADER}: ${API_VERSION}, or leave the header out.`,
  });

const route = (request: NextRequest): NextResponse | Response => {
  const { pathname } = request.nextUrl;
  const requested = request.headers.get(API_VERSION_HEADER);
  if (isVersionedApiPath(pathname) && isUnsupportedVersion(requested)) {
    return unsupportedVersion(request, requested ?? "");
  }
  const markdown =
    (request.method === "GET" || request.method === "HEAD") &&
    isMarkdownPreferred(request);

  if (pathname === ROUTES.HOME && markdown) {
    const url = request.nextUrl.clone();
    url.pathname = homeContentRoute;
    return NextResponse.rewrite(url);
  }

  const result = rewriteSuffix(pathname);
  if (result) {
    return NextResponse.rewrite(new URL(result, request.nextUrl));
  }

  const slug = trustSlug(pathname);
  if (slug && (markdown || pathname.endsWith(".md"))) {
    return NextResponse.rewrite(
      new URL(`${ROUTES.LLMS_MD}/pages/${slug}`, request.nextUrl)
    );
  }

  if (markdown) {
    const result2 = rewriteDocs(pathname);
    if (result2) {
      return NextResponse.rewrite(new URL(result2, request.nextUrl));
    }
    if (pathname !== ROUTES.HOME && !slug && isPagePath(pathname)) {
      return markdownNotFound(request.nextUrl.origin, pathname);
    }
  }

  return NextResponse.next();
};

const proxy = (request: NextRequest, event: NextFetchEvent) => {
  const response = route(request);
  const { pathname } = request.nextUrl;

  // Agent and CLI fetches (registry items, the skill, llms.txt) run no
  // JavaScript, so they're recorded here, after the response is on its way.
  const analytics =
    request.method === "GET" ? serverEventFor(pathname) : undefined;
  if (analytics) {
    event.waitUntil(capture(analytics, request));
  }

  // Pages answer in HTML or Markdown depending on Accept, so caches must key
  // on it. Next's own router Vary is repeated so this never drops it.
  if (isPagePath(pathname) || pathname.endsWith(".md")) {
    response.headers.set("Vary", PAGE_VARY);
  }
  if (isRateLimited(pathname)) {
    for (const [name, value] of Object.entries(RATE_LIMIT_HEADERS)) {
      response.headers.set(name, value);
    }
  }
  return response;
};

export default proxy;
