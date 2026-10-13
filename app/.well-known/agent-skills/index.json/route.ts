import { ROUTES } from "@/constants/routes";
import { requestOrigin } from "@/lib/agent-discovery/request-origin";
import { siteAgentSkillDigest } from "@/lib/agent-discovery/site-agent-skill";

export const GET = (request: Request) => {
  const origin = requestOrigin(request);
  const base = origin.replace(/\/$/, "");

  return Response.json(
    {
      $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
      skills: [
        {
          description:
            "Discover and install dithercn pieces: dithered backgrounds, charts and UI for shadcn projects.",
          digest: siteAgentSkillDigest(),
          name: "dithercn",
          type: "skill-md",
          url: `${base}${ROUTES.AGENT_SKILLS_SITE_SKILL}`,
        },
      ],
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
};
