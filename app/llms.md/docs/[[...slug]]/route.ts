import { SITE } from "@/constants/site";
import { markdownNotFound } from "@/lib/agent-discovery/markdown-404";
import { markdownResponse } from "@/lib/api";
import { getLLMText, getPageMarkdownUrl, source } from "@/lib/source";

export const revalidate = false;

const docsMarkdown = async (
  { params }: { params: Promise<{ slug?: string[] }> },
  includeBody: boolean
) => {
  const { slug } = await params;
  const page = source.getPage(slug?.slice(0, -1));
  if (!page) {
    const docsPath = ["/docs", ...(slug?.slice(0, -1) ?? [])].join("/");
    // Static route: reading request.url here would fail the render.
    return markdownNotFound(SITE.URL, docsPath);
  }

  return markdownResponse(await getLLMText(page), includeBody);
};

export const GET = (
  _request: Request,
  context: { params: Promise<{ slug?: string[] }> }
) => docsMarkdown(context, true);

export const HEAD = (
  _request: Request,
  context: { params: Promise<{ slug?: string[] }> }
) => docsMarkdown(context, false);

export const generateStaticParams = () =>
  source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageMarkdownUrl(page).segments,
  }));
