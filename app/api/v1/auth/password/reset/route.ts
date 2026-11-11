import { handle, noContent, readBody } from "@/app/_lib/api/http";
import { resetPasswordWithToken } from "@/app/_lib/domain/account";

export const POST = handle(async (request) => {
  const body = await readBody(request);
  await resetPasswordWithToken(body.token, body.password);
  return noContent();
});
