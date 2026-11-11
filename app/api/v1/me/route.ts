import { requireAuth } from "@/app/_lib/api/auth";
import { handle, noContent, readBody } from "@/app/_lib/api/http";
import { userJson } from "@/app/_lib/api/serialize";
import { deleteOwnAccount, updateOwnProfile } from "@/app/_lib/domain/account";
import { DomainError } from "@/app/_lib/errors";
import { findSessionUser } from "@/app/_lib/sessions";
import { currentToken } from "@/app/_lib/auth";

export const GET = handle(async () => ({ user: userJson(await requireAuth()) }));

export const PATCH = handle(async (request) => {
  const me = await requireAuth();
  await updateOwnProfile(me.id, await readBody(request));
  // Relê do banco: o usuário da requisição ainda tem os dados de antes.
  const user = await findSessionUser((await currentToken()) ?? "");
  if (!user) throw new DomainError("unauthenticated", "Entre na sua conta para continuar.");
  return { user: userJson(user) };
});

export const DELETE = handle(async (request) => {
  const me = await requireAuth();
  await deleteOwnAccount(me.id, (await readBody(request)).password);
  return noContent();
});
