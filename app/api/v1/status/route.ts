import {
  getStatus,
  methodNotAllowed,
  options,
} from "@/lib/agent-discovery/status-api";

export const dynamic = "force-dynamic";

export const GET = getStatus;
export const OPTIONS = options;
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
