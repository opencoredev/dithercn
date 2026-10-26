import { LINK } from "@/constants/links";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";
import { PROBLEMS } from "@/lib/agent-discovery/problem";
import {
  API_VERSION,
  API_VERSION_HEADER,
} from "@/lib/agent-discovery/status-api";
import { homeContentRoute } from "@/lib/docs";

type Schema = Record<string, unknown>;

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const DESCRIPTION = `Read-only HTTP surfaces for the ${SITE.NAME} documentation site, its shadcn/ui component registry and its agent skill. No authentication.

Versioning: JSON endpoints are versioned in the URL path (\`/api/v1/\`). Clients may also send the optional \`${API_VERSION_HEADER}\` header; the only version is \`${API_VERSION}\`, and any other value is rejected with a 400 \`unsupported_api_version\` problem. Breaking changes ship under a new path version (\`/api/v2/\`), never in place. Unversioned paths such as \`${ROUTES.API_STATUS}\` are aliases of the current version.

Deprecation: a deprecated endpoint sends a \`Deprecation\` header (RFC 9745) and a \`Sunset\` header (RFC 8594) with the removal date, at least 90 days before it is removed, plus a \`Link\` header with \`rel="deprecation"\` pointing at the replacement.

Errors: every JSON error is an RFC 9457 problem (\`application/problem+json\`) with \`type\`, \`title\`, \`status\`, \`detail\`, \`code\`, \`message\` and \`resolution\`. See the ProblemDetails schema for every code.

Rate limits: these surfaces advertise a budget of 1000 requests per 60 seconds per client in \`RateLimit-*\` (and \`X-RateLimit-*\`) headers. Stay under it; a 429 problem with \`Retry-After\` means slow down.`;

const VERSION_PARAMETER = {
  description: `API version. Optional; the only supported value is ${API_VERSION}.`,
  in: "header",
  name: API_VERSION_HEADER,
  required: false,
  schema: { enum: [API_VERSION], type: "string" },
};

const RATE_LIMIT_RESPONSE_HEADERS = {
  "RateLimit-Limit": { $ref: "#/components/headers/RateLimitLimit" },
  "RateLimit-Remaining": { $ref: "#/components/headers/RateLimitRemaining" },
  "RateLimit-Reset": { $ref: "#/components/headers/RateLimitReset" },
};

const ERROR_RESPONSES = {
  "400": { $ref: "#/components/responses/BadRequest" },
  "404": { $ref: "#/components/responses/NotFound" },
  "429": { $ref: "#/components/responses/TooManyRequests" },
  "500": { $ref: "#/components/responses/InternalError" },
};

const operation = ({
  id,
  summary,
  description,
  mediaType,
  schema,
  okDescription,
  tag,
  parameters = [],
}: {
  id: string;
  summary: string;
  description: string;
  mediaType: string;
  schema: Schema;
  okDescription: string;
  tag: string;
  parameters?: Schema[];
}) => ({
  description,
  operationId: id,
  parameters: [...parameters, VERSION_PARAMETER],
  responses: {
    "200": {
      content: { [mediaType]: { schema } },
      description: okDescription,
      headers: RATE_LIMIT_RESPONSE_HEADERS,
    },
    ...ERROR_RESPONSES,
  },
  summary,
  tags: [tag],
});

const MARKDOWN = { description: "Markdown text", type: "string" } as const;
const PLAIN_TEXT = { description: "Plain text", type: "string" } as const;

const statusOperation = (id: string, alias: boolean) =>
  operation({
    description: alias
      ? `Unversioned alias of ${ROUTES.API_STATUS_V1}, with the same response. New clients should call the versioned path.`
      : "Reports that the site and its API are up. Pass verbose=true to include the server time.",
    id,
    mediaType: "application/json",
    okDescription: "The service is up",
    parameters: [
      {
        description: "Include the server time in the response.",
        in: "query",
        name: "verbose",
        required: false,
        schema: { default: "false", enum: ["true", "false"], type: "string" },
      },
    ],
    schema: ref("Status"),
    summary: alias ? "Service health (unversioned alias)" : "Service health",
    tag: "Status",
  });

export const buildOpenApiDocument = (origin: string): Schema => {
  const base = origin.replace(/\/$/, "");

  return {
    components: {
      headers: {
        RateLimitLimit: {
          description: "Requests allowed per window.",
          schema: { example: 1000, type: "integer" },
        },
        RateLimitRemaining: {
          description: "Requests left in the current window.",
          schema: { example: 999, type: "integer" },
        },
        RateLimitReset: {
          description: "Seconds until the window resets.",
          schema: { example: 60, type: "integer" },
        },
      },
      responses: {
        BadRequest: {
          content: {
            "application/problem+json": { schema: ref("ProblemDetails") },
          },
          description: "A parameter or header is invalid",
        },
        InternalError: {
          content: {
            "application/problem+json": { schema: ref("ProblemDetails") },
          },
          description: "Unexpected server error",
        },
        NotFound: {
          content: {
            "application/problem+json": { schema: ref("ProblemDetails") },
          },
          description: "Nothing at this path",
        },
        TooManyRequests: {
          content: {
            "application/problem+json": { schema: ref("ProblemDetails") },
          },
          description: "Rate limit exceeded",
          headers: {
            "Retry-After": {
              description: "Seconds to wait before retrying.",
              schema: { type: "integer" },
            },
          },
        },
      },
      schemas: {
        AgentSkillsIndex: {
          properties: {
            $schema: { format: "uri", type: "string" },
            skills: {
              items: {
                properties: {
                  description: { type: "string" },
                  digest: { type: "string" },
                  name: { type: "string" },
                  type: { enum: ["archive"], type: "string" },
                  url: { format: "uri", type: "string" },
                },
                required: ["name", "description", "type", "url", "digest"],
                type: "object",
              },
              type: "array",
            },
          },
          required: ["$schema", "skills"],
          type: "object",
        },
        Linkset: {
          properties: {
            linkset: {
              items: {
                additionalProperties: true,
                properties: { anchor: { format: "uri", type: "string" } },
                required: ["anchor"],
                type: "object",
              },
              type: "array",
            },
          },
          required: ["linkset"],
          type: "object",
        },
        OpenApiDocument: {
          additionalProperties: true,
          properties: {
            info: { type: "object" },
            openapi: { type: "string" },
            paths: { type: "object" },
          },
          required: ["openapi", "info", "paths"],
          type: "object",
        },
        ProblemDetails: {
          description:
            "RFC 9457 problem details with fields agents can act on.",
          properties: {
            code: {
              description: "Machine-readable error code.",
              enum: Object.keys(PROBLEMS),
              type: "string",
            },
            detail: {
              description: "What went wrong, for this request.",
              type: "string",
            },
            instance: { description: "The request path.", type: "string" },
            message: {
              description: "Human-readable message, the same as detail.",
              type: "string",
            },
            resolution: { description: "What to do next.", type: "string" },
            status: { description: "HTTP status code.", type: "integer" },
            title: {
              description: "Short summary of the error type.",
              type: "string",
            },
            type: {
              description: "URI of this schema.",
              format: "uri",
              type: "string",
            },
          },
          required: [
            "type",
            "title",
            "status",
            "detail",
            "code",
            "message",
            "resolution",
          ],
          type: "object",
        },
        Registry: {
          properties: {
            $schema: { format: "uri", type: "string" },
            homepage: { format: "uri", type: "string" },
            items: {
              items: ref("RegistryItemSummary"),
              type: "array",
            },
            name: { type: "string" },
          },
          required: ["name", "homepage", "items"],
          type: "object",
        },
        RegistryItem: {
          additionalProperties: true,
          properties: {
            $schema: { format: "uri", type: "string" },
            dependencies: { items: { type: "string" }, type: "array" },
            description: { type: "string" },
            files: {
              items: {
                properties: {
                  content: { type: "string" },
                  path: { type: "string" },
                  target: { type: "string" },
                  type: { type: "string" },
                },
                required: ["path", "type"],
                type: "object",
              },
              type: "array",
            },
            name: { type: "string" },
            registryDependencies: { items: { type: "string" }, type: "array" },
            title: { type: "string" },
            type: { type: "string" },
          },
          required: ["name", "type", "files"],
          type: "object",
        },
        RegistryItemSummary: {
          additionalProperties: true,
          properties: {
            description: { type: "string" },
            name: { type: "string" },
            title: { type: "string" },
            type: { type: "string" },
          },
          required: ["name", "type"],
          type: "object",
        },
        Status: {
          properties: {
            status: { enum: ["ok"], type: "string" },
            time: {
              description: "Server time, with verbose=true.",
              format: "date-time",
              type: "string",
            },
            version: { example: API_VERSION, type: "string" },
          },
          required: ["status", "version"],
          type: "object",
        },
      },
    },
    externalDocs: {
      description:
        "Use the maintained shadcn MCP server for registry browsing, search, and installation workflows.",
      url: LINK.SHADCN_MCP_DOCS,
    },
    info: {
      contact: {
        email: "leo@dithercn.dev",
        name: SITE.AUTHOR.NAME,
        url: `${base}/contact`,
      },
      description: DESCRIPTION,
      license: { name: "MIT", url: LINK.MIT_LICENSE },
      title: `${SITE.NAME} public HTTP API`,
      version: "1.0.0",
    },
    openapi: "3.0.3",
    paths: {
      [ROUTES.API_STATUS_V1]: { get: statusOperation("getStatusV1", false) },
      [ROUTES.API_STATUS]: { get: statusOperation("getStatus", true) },
      [ROUTES.REGISTRY]: {
        get: operation({
          description:
            "Every item in the dithercn shadcn/ui registry: the engine, the agent skill and each example component.",
          id: "getRegistry",
          mediaType: "application/json",
          okDescription: "The registry manifest",
          schema: ref("Registry"),
          summary: "List registry items",
          tag: "Registry",
        }),
      },
      "/r/{name}.json": {
        get: operation({
          description:
            "One registry item with its files, as the shadcn CLI installs it. A name that doesn't exist returns a registry_item_not_found problem.",
          id: "getRegistryItem",
          mediaType: "application/json",
          okDescription: "The registry item",
          parameters: [
            {
              description:
                "Item name from the registry manifest, such as dither-core or dithercn-skill.",
              in: "path",
              name: "name",
              required: true,
              schema: { pattern: "^[a-z0-9-]+$", type: "string" },
            },
          ],
          schema: ref("RegistryItem"),
          summary: "Get a registry item",
          tag: "Registry",
        }),
      },
      [ROUTES.AGENT_SKILLS_INDEX]: {
        get: operation({
          description:
            "Agent Skills discovery index listing the dithercn skill archive and its digest.",
          id: "getAgentSkillsIndex",
          mediaType: "application/json",
          okDescription: "The agent skills index",
          schema: ref("AgentSkillsIndex"),
          summary: "List agent skills",
          tag: "Agents",
        }),
      },
      [ROUTES.AGENT_SKILL]: {
        get: operation({
          description:
            "The dithercn agent skill: how to build any dither on the engine and place it on a page.",
          id: "getAgentSkill",
          mediaType: "text/markdown",
          okDescription: "SKILL.md",
          schema: MARKDOWN,
          summary: "Get the agent skill",
          tag: "Agents",
        }),
      },
      [ROUTES.API_CATALOG]: {
        get: operation({
          description:
            "RFC 9727 API catalog linking this description, the docs and the status endpoint.",
          id: "getApiCatalog",
          mediaType: "application/linkset+json",
          okDescription: "The API catalog linkset",
          schema: ref("Linkset"),
          summary: "Get the API catalog",
          tag: "Discovery",
        }),
      },
      [ROUTES.LLMS]: {
        get: operation({
          description:
            "Index of every docs page as a Markdown link, with when to use dithercn and the official CLI commands.",
          id: "getLlmsIndex",
          mediaType: "text/plain",
          okDescription: "llms.txt",
          schema: PLAIN_TEXT,
          summary: "Get the LLM docs index",
          tag: "Discovery",
        }),
      },
      [ROUTES.LLMS_FULL]: {
        get: operation({
          description:
            "Every docs page concatenated into one Markdown document.",
          id: "getLlmsFull",
          mediaType: "text/plain",
          okDescription: "llms-full.txt",
          schema: PLAIN_TEXT,
          summary: "Get the full docs export",
          tag: "Discovery",
        }),
      },
      [ROUTES.OPENAPI]: {
        get: operation({
          description: "This OpenAPI 3.0 description.",
          id: "getOpenApiDocument",
          mediaType: "application/json",
          okDescription: "The OpenAPI document",
          schema: ref("OpenApiDocument"),
          summary: "Get the OpenAPI description",
          tag: "Discovery",
        }),
      },
      [homeContentRoute]: {
        get: operation({
          description:
            "The home page as Markdown. The home page URL returns the same body for Accept: text/markdown.",
          id: "getHomeMarkdown",
          mediaType: "text/markdown",
          okDescription: "Home page Markdown",
          schema: MARKDOWN,
          summary: "Get the home page as Markdown",
          tag: "Discovery",
        }),
      },
    },
    servers: [{ url: base }],
    tags: [
      { description: "Health checks", name: "Status" },
      { description: "The shadcn/ui component registry", name: "Registry" },
      { description: "The agent skill", name: "Agents" },
      { description: "Docs and machine-readable indexes", name: "Discovery" },
    ],
  };
};
