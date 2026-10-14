import { ROUTES } from "@/constants/routes";
import {
  SKILL_DESCRIPTION,
  SKILL_NAME,
  skillArchiveDigest,
} from "@/lib/agent-discovery/dithercn-skill";
import { requestOrigin } from "@/lib/agent-discovery/request-origin";

export const GET = (request: Request) => {
  const base = requestOrigin(request).replace(/\/$/, "");

  return Response.json(
    {
      $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
      skills: [
        {
          description: SKILL_DESCRIPTION,
          digest: skillArchiveDigest(base),
          name: SKILL_NAME,
          type: "archive",
          url: `${base}${ROUTES.AGENT_SKILL_ARCHIVE}`,
        },
      ],
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
};
