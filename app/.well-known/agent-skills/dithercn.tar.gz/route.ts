import { skillArchive } from "@/lib/agent-discovery/dithercn-skill";
import { requestOrigin } from "@/lib/agent-discovery/request-origin";

export const GET = (request: Request) =>
  new Response(new Uint8Array(skillArchive(requestOrigin(request))), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": 'attachment; filename="dithercn.tar.gz"',
      "Content-Type": "application/gzip",
    },
  });
