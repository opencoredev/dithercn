import { z } from "zod";

import { problemResponse } from "@/lib/agent-discovery/problem";
import { requestOrigin } from "@/lib/agent-discovery/request-origin";

export const API_VERSION = "1";
export const API_VERSION_HEADER = "X-API-Version";
const ALLOWED_METHODS = "GET, HEAD, OPTIONS";

const verboseSchema = z.enum(["true", "false"]).optional();

export interface StatusBody {
  status: "ok";
  version: string;
  time?: string;
}

/**
 * GET handler shared by /api/v1/status and its unversioned alias
 * /api/status. Optional `?verbose=true` adds the server time; an
 * X-API-Version header other than 1 is rejected rather than ignored.
 */
export const getStatus = (request: Request): Response => {
  const origin = requestOrigin(request);
  const requested = request.headers.get(API_VERSION_HEADER);
  if (requested !== null && requested.trim() !== API_VERSION) {
    return problemResponse({
      code: "unsupported_api_version",
      detail: `${API_VERSION_HEADER} "${requested}" is not supported. The only version is ${API_VERSION}.`,
      origin,
      request,
      resolution: `Send ${API_VERSION_HEADER}: ${API_VERSION}, or leave the header out.`,
    });
  }

  const verbose = verboseSchema.safeParse(
    new URL(request.url).searchParams.get("verbose") ?? undefined
  );
  if (!verbose.success) {
    return problemResponse({
      code: "invalid_parameter",
      detail: 'The "verbose" query parameter must be "true" or "false".',
      origin,
      request,
      resolution: "Use ?verbose=true, ?verbose=false, or leave it out.",
    });
  }

  const body: StatusBody = {
    status: "ok",
    version: API_VERSION,
    ...(verbose.data === "true" && { time: new Date().toISOString() }),
  };
  return Response.json(body, {
    headers: {
      "Cache-Control": "no-store",
      [API_VERSION_HEADER]: API_VERSION,
    },
  });
};

export const methodNotAllowed = (request: Request): Response =>
  problemResponse({
    code: "method_not_allowed",
    detail: `${request.method} is not supported on ${new URL(request.url).pathname}.`,
    headers: { Allow: ALLOWED_METHODS },
    origin: requestOrigin(request),
    request,
    resolution: `Use one of: ${ALLOWED_METHODS}.`,
  });

export const options = () =>
  new Response(null, { headers: { Allow: ALLOWED_METHODS }, status: 204 });
