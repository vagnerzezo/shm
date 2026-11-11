import { requireAuth } from "@/app/_lib/api/auth";
import { handle, noContent } from "@/app/_lib/api/http";
import { currentToken } from "@/app/_lib/auth";
import { revokeSession } from "@/app/_lib/sessions";

export const POST = handle(async () => {
  await requireAuth();
  const token = await currentToken();
  if (token) await revokeSession(token);
  return noContent();
});
