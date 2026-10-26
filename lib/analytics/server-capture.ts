import { POSTHOG_HOST, POSTHOG_KEY } from "@/lib/analytics/config";
import backgroundsA from "@/registry/backgrounds-a.json";
import backgroundsB from "@/registry/backgrounds-b.json";
import backgroundsC from "@/registry/backgrounds-c.json";
import backgroundsD from "@/registry/backgrounds-d.json";
import backgrounds from "@/registry/backgrounds.json";
import base from "@/registry/base.json";
import chartsA from "@/registry/charts-a.json";
import chartsB from "@/registry/charts-b.json";
import engine from "@/registry/engine.json";
import images from "@/registry/images.json";
import ui from "@/registry/interface.json";
import text from "@/registry/text.json";

// Agents and CLIs fetch these files without running any JavaScript, so the
// request proxy records them server-side. Nothing here may delay or fail the
// response: the proxy hands capture() to waitUntil and ignores its result.

type Category =
  | "skill"
  | "engine"
  | "backgrounds"
  | "charts"
  | "ui"
  | "text"
  | "media"
  | "index"
  | "unknown";

const named = (items: readonly { name: string }[], category: Category) =>
  items.map((item) => [item.name, category] as const);

const CATEGORY_BY_ITEM = new Map<string, Category>([
  ...named(
    [
      ...backgrounds,
      ...backgroundsA,
      ...backgroundsB,
      ...backgroundsC,
      ...backgroundsD,
    ],
    "backgrounds"
  ),
  ...named([...chartsA, ...chartsB], "charts"),
  ...named(ui, "ui"),
  ...named(text, "text"),
  ...named(images, "media"),
  ...named(base, "engine"),
  ...named(engine, "engine"),
  ["dithercn-skill", "skill"],
  ["registry", "index"],
]);

const CLIENT_TOOLS: readonly (readonly [RegExp, string])[] = [
  [/shadcn/i, "shadcn-cli"],
  [/\bskills?\b|skills-cli|vercel-skills/i, "skills-cli"],
  [/claude/i, "claude-code"],
  [/cursor/i, "cursor"],
  [/codex|openai/i, "codex"],
  [/gemini|google-?cli/i, "gemini-cli"],
  [/\bcurl\//i, "curl"],
  [/\bwget\//i, "wget"],
  [/python|httpx|aiohttp/i, "python"],
  [/bot|crawler|spider|slurp/i, "crawler"],
  [/mozilla\//i, "browser"],
  [/node-fetch|undici|\bnode\b|bun\//i, "node-fetch"],
];

export const clientTool = (userAgent: string) =>
  userAgent
    ? (CLIENT_TOOLS.find(([pattern]) => pattern.test(userAgent))?.[1] ??
      "other")
    : "unknown";

export type ServerEvent =
  | {
      name: "registry_component_installed";
      properties: {
        component_name: string;
        category: Category;
        install_type: InstallType;
        found: boolean;
      };
    }
  | { name: "agent_skill_fetched"; properties: { skill_file: string } }
  | {
      name: "llms_txt_fetched";
      properties: { variant: "llms.txt" | "llms-full.txt" };
    };

type InstallType = "skill" | "engine" | "component" | "index";

const INSTALL_TYPE: Record<Category, InstallType> = {
  backgrounds: "component",
  charts: "component",
  engine: "engine",
  index: "index",
  media: "component",
  skill: "skill",
  text: "component",
  ui: "component",
  unknown: "component",
};

const SKILL_PREFIX = "/.well-known/agent-skills/";

/** The event a request for `pathname` records, if any. */
export const serverEventFor = (pathname: string): ServerEvent | undefined => {
  const item = /^\/r\/([^/]+)\.json$/.exec(pathname)?.[1];
  if (item) {
    const category = CATEGORY_BY_ITEM.get(item);
    const installType = category ? INSTALL_TYPE[category] : "component";
    return {
      name: "registry_component_installed",
      properties: {
        category: category ?? "unknown",
        component_name: item,
        found: category !== undefined,
        install_type: installType,
      },
    };
  }
  if (
    pathname.startsWith(SKILL_PREFIX) ||
    pathname === "/SKILL.md" ||
    pathname.startsWith("/skills/")
  ) {
    return {
      name: "agent_skill_fetched",
      properties: {
        skill_file: pathname
          .replace(SKILL_PREFIX, "")
          .replace(/^\/(skills\/)?/, ""),
      },
    };
  }
  if (pathname === "/llms.txt" || pathname === "/llms-full.txt") {
    return {
      name: "llms_txt_fetched",
      properties: {
        variant: pathname === "/llms.txt" ? "llms.txt" : "llms-full.txt",
      },
    };
  }
  return undefined;
};

/**
 * Sends one server-side event to PostHog. Each request is its own anonymous
 * event: no person profile, no cookie, and no visitor IP (PostHog sees the
 * server's address, so GeoIP is off).
 */
export const capture = async (
  event: ServerEvent,
  request: { url: string; headers: Headers }
): Promise<void> => {
  const userAgent = request.headers.get("user-agent") ?? "";
  const url = new URL(request.url);
  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        distinct_id: `server-${crypto.randomUUID()}`,
        event: event.name,
        properties: {
          ...event.properties,
          $current_url: url.href,
          $geoip_disable: true,
          $lib: "dithercn-proxy",
          $process_person_profile: false,
          client_tool: clientTool(userAgent),
          path: url.pathname,
          referer: request.headers.get("referer") ?? null,
          user_agent: userAgent,
        },
        timestamp: new Date().toISOString(),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  } catch {
    // Analytics never breaks a download.
  }
};
