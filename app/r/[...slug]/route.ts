import { ROUTES } from "@/constants/routes";
import { problemResponse } from "@/lib/agent-discovery/problem";
import { requestOrigin } from "@/lib/agent-discovery/request-origin";

// Registry items are static files in public/r, served before this route. It
// only answers for names that don't exist, with a JSON 404 the shadcn CLI and
// agents can read.
export const GET = (request: Request) => {
  const origin = requestOrigin(request).replace(/\/$/, "");
  const name = new URL(request.url).pathname.replace(/^\/r\//, "");
  return problemResponse({
    code: "registry_item_not_found",
    detail: `There is no registry item at /r/${name}.`,
    origin,
    request,
    resolution: `List every item at ${origin}${ROUTES.REGISTRY}, then request ${origin}/r/<name>.json.`,
  });
};

export const HEAD = GET;
