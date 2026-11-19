import { after } from "next/server";
import { created, handle, readBody } from "@/app/_lib/api/http";
import { sessionJson } from "@/app/_lib/api/serialize";
import { clientIp } from "@/app/_lib/client-ip";
import { registerCustomer } from "@/app/_lib/domain/account";
import { sendWelcomeEmail } from "@/app/_lib/email-templates/send";
import { toCustomer } from "@/app/_lib/roles";
import { createSessionToken } from "@/app/_lib/sessions";

export const POST = handle(async (request) => {
  const body = await readBody(request);
  const user = await registerCustomer(body, body.password, clientIp(request.headers));
  after(() => sendWelcomeEmail(user.id));
  return created(sessionJson(await createSessionToken(user.id), toCustomer(user)));
});
