import { handle, noContent, readBody } from "@/app/_lib/api/http";
import { requestPasswordResetFor } from "@/app/_lib/domain/account";

// Responde sempre igual, para não revelar quais e-mails têm conta.
export const POST = handle(async (request) => {
  await requestPasswordResetFor((await readBody(request)).email);
  return noContent();
});
