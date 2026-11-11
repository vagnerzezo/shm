import { handle, readBody, requireString } from "@/app/_lib/api/http";
import { sessionJson } from "@/app/_lib/api/serialize";
import { authenticate } from "@/app/_lib/domain/account";
import { toCustomer } from "@/app/_lib/roles";
import { createSessionToken } from "@/app/_lib/sessions";

export const POST = handle(async (request) => {
  const body = await readBody(request);
  const email = requireString(body, "email", "Informe o e-mail.");
  const password = requireString(body, "password", "Informe a senha.");
  const user = await authenticate(email, password);
  return sessionJson(await createSessionToken(user.id), toCustomer(user));
});
