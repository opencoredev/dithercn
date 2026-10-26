import { ROUTES } from "@/constants/routes";
import { problemResponse } from "@/lib/agent-discovery/problem";
import { requestOrigin } from "@/lib/agent-discovery/request-origin";

// Any /api path without its own route: a JSON 404, never the HTML page.
const notFound = (request: Request) => {
  const origin = requestOrigin(request).replace(/\/$/, "");
  return problemResponse({
    code: "not_found",
    detail: `No API endpoint at ${new URL(request.url).pathname}.`,
    origin,
    request,
    resolution: `See ${origin}${ROUTES.OPENAPI} for every endpoint, or try ${origin}${ROUTES.API_STATUS_V1}.`,
  });
};

export const GET = notFound;
export const HEAD = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const OPTIONS = notFound;
