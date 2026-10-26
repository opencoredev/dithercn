import { requestOrigin } from "@/lib/agent-discovery/request-origin";
import { markdownResponse } from "@/lib/api";
import {
  TRUST_PAGES,
  TRUST_PAGE_SLUGS,
  isTrustPageSlug,
  trustPageMarkdown,
} from "@/lib/trust-pages";

export const dynamicParams = false;

export const generateStaticParams = () =>
  TRUST_PAGE_SLUGS.map((slug) => ({ slug }));

const respond = async (
  request: Request,
  { params }: RouteContext<"/llms.md/pages/[slug]">,
  includeBody: boolean
) => {
  const { slug } = await params;
  if (!isTrustPageSlug(slug)) {
    return new Response(null, { status: 404 });
  }
  return markdownResponse(
    trustPageMarkdown(TRUST_PAGES[slug], requestOrigin(request)),
    includeBody
  );
};

export const GET = (
  request: Request,
  context: RouteContext<"/llms.md/pages/[slug]">
) => respond(request, context, true);

export const HEAD = (
  request: Request,
  context: RouteContext<"/llms.md/pages/[slug]">
) => respond(request, context, false);
