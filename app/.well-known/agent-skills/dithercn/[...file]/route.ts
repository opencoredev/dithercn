import { renderSkillFile } from "@/lib/agent-discovery/dithercn-skill";
import { requestOrigin } from "@/lib/agent-discovery/request-origin";

export const GET = async (
  request: Request,
  { params }: RouteContext<"/.well-known/agent-skills/dithercn/[...file]">
) => {
  const { file } = await params;
  const markdown = renderSkillFile(file.join("/"), requestOrigin(request));
  if (markdown === null) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(markdown, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
};
