import { ROUTES } from "@/constants/routes";
import { renderSkillFile } from "@/lib/agent-discovery/dithercn-skill";
import { problemResponse } from "@/lib/agent-discovery/problem";
import { requestOrigin } from "@/lib/agent-discovery/request-origin";

export const GET = async (
  request: Request,
  { params }: RouteContext<"/.well-known/agent-skills/dithercn/[...file]">
) => {
  const { file } = await params;
  const origin = requestOrigin(request);
  const markdown = renderSkillFile(file.join("/"), origin);
  if (markdown === null) {
    return problemResponse({
      code: "not_found",
      detail: `The dithercn skill has no file named ${file.join("/")}.`,
      origin,
      request,
      resolution: `Start from ${origin.replace(/\/$/, "")}${ROUTES.AGENT_SKILL}, which links every reference file.`,
    });
  }
  return new Response(markdown, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
};
