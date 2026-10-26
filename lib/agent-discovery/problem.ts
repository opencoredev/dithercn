// RFC 9457 problem details, with the code/message/resolution fields agents
// read to decide what to do next. Every JSON error the site returns uses it.

export const PROBLEM_CONTENT_TYPE = "application/problem+json";

export const PROBLEMS = {
  invalid_parameter: { status: 400, title: "Invalid parameter" },
  method_not_allowed: { status: 405, title: "Method not allowed" },
  not_found: { status: 404, title: "Not found" },
  registry_item_not_found: { status: 404, title: "Registry item not found" },
  unsupported_api_version: { status: 400, title: "Unsupported API version" },
} as const;

export type ProblemCode = keyof typeof PROBLEMS;

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: ProblemCode;
  message: string;
  resolution: string;
}

// Points at the schema that documents every code, in the OpenAPI description.
const problemTypeUrl = (origin: string) =>
  `${origin.replace(/\/$/, "")}/openapi.json#/components/schemas/ProblemDetails`;

export const problemResponse = ({
  code,
  detail,
  resolution,
  request,
  origin,
  headers,
}: {
  code: ProblemCode;
  detail: string;
  resolution: string;
  request: Request;
  origin: string;
  headers?: Record<string, string>;
}): Response => {
  const { status, title } = PROBLEMS[code];
  const body: ProblemDetails = {
    code,
    detail,
    instance: new URL(request.url).pathname,
    message: detail,
    resolution,
    status,
    title,
    type: problemTypeUrl(origin),
  };

  return Response.json(body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": PROBLEM_CONTENT_TYPE,
      ...headers,
    },
    status,
  });
};
