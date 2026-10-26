import { ROUTES } from "@/constants/routes";

/**
 * The 404 an agent gets when it asks for Markdown at a path that doesn't
 * exist: a short explanation and the three places to look next.
 */
export const markdownNotFound = (
  origin: string,
  pathname: string
): Response => {
  const base = origin.replace(/\/$/, "");
  const body = `# Page not found

There is no page at \`${pathname}\` on dithercn. It may have moved, or the URL may have a typo. dithercn is a dither engine for shadcn/ui projects with an agent skill; every page is listed in the places below.

- [Documentation](${base}${ROUTES.DOCS}.md): start with the introduction
- [Sitemap](${base}${ROUTES.SITEMAP}): every page on the site
- [llms.txt](${base}${ROUTES.LLMS}): the index of docs pages as Markdown
`;

  return new Response(body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept",
    },
    status: 404,
  });
};
