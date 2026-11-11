import { requireAuth } from "@/app/_lib/api/auth";
import { handle, noContent, readBody } from "@/app/_lib/api/http";
import { currentToken } from "@/app/_lib/auth";
import { changeOwnPassword } from "@/app/_lib/domain/account";

export const POST = handle(async (request) => {
  const me = await requireAuth();
  const body = await readBody(request);
  await changeOwnPassword(me.id, body.current, body.password, await currentToken());
  return noContent();
});
