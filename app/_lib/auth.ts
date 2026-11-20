import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { canOpen, scopeOf, type Scope } from "./access";
import { DomainError } from "./errors";
import { homeOf, type BarberMenu, type Customer } from "./roles";
import { createSessionToken, findSessionUser, revokeSession } from "./sessions";

export { hashPassword, verifyPassword } from "./passwords";
export { homeOf, roleOf, type Customer } from "./roles";

const SESSION_COOKIE = "shm_sessao";

/** Só em Server Actions: grava a sessão e o cookie. */
export async function createSession(userId: string) {
  const { token, expiresAt } = await createSessionToken(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

/** Só em Server Actions. */
export async function deleteSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await revokeSession(token);
  store.delete(SESSION_COOKIE);
}

/** Token da requisição: `Authorization: Bearer <token>` (app) tem prioridade sobre o cookie (site). */
export async function currentToken(): Promise<string | null> {
  const authorization = (await headers()).get("authorization");
  if (authorization !== null) {
    const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
    return match ? match[1] : null;
  }
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export const getCurrentUser = cache(async (): Promise<Customer | null> => {
  const token = await currentToken();
  return token ? findSessionUser(token) : null;
});

/** Aceita só caminhos internos, para o `next` não virar redirecionamento aberto. */
export function safeNext(next: unknown, fallback = "/reservas") {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : fallback;
}

export function loginHref(next: string) {
  return `/login?next=${encodeURIComponent(next)}`;
}

/** Para páginas que exigem login: volta para `next` depois de entrar. */
export async function requireUser(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(loginHref(next));
  return user;
}

/** Página do painel aberta à equipe: sem permissão para o menu, volta para a área da pessoa. */
export async function requireMenu(menu: BarberMenu, next: string): Promise<{ user: Customer; scope: Scope }> {
  const user = await requireUser(next);
  if (!canOpen(user, menu)) redirect(homeOf(user));
  return { user, scope: scopeOf(user) };
}

/** Server Action de um menu da equipe: sem permissão, `forbidden`. */
export async function assertMenu(menu: BarberMenu): Promise<{ user: Customer; scope: Scope }> {
  const user = await getCurrentUser();
  if (!user || !canOpen(user, menu)) throw new DomainError("forbidden", "Sem permissão.");
  return { user, scope: scopeOf(user) };
}

/** Para páginas do painel admin: cliente ou barbeiro logado volta para a área dele. */
export async function requireAdmin(next: string) {
  const user = await requireUser(next);
  if (user.role !== "admin") redirect(homeOf(user));
  return user;
}

/** Tela "Minha agenda": barbeiro, ou admin ligado a um profissional. Os outros vão para a área deles. */
export async function requireBarberPage(next: string): Promise<Customer & { professional: string }> {
  const user = await requireUser(next);
  // Barbeiro ainda sem profissional ligado: só "Meus dados" (evita voltar para cá em laço).
  if (user.role === "barbeiro" && !user.professional) redirect("/conta");
  if ((user.role !== "barbeiro" && user.role !== "admin") || !user.professional) redirect(homeOf(user));
  return { ...user, professional: user.professional };
}

/** Telas de cliente (agendar, reservas, mensagens): o barbeiro vai para a agenda dele. */
export function keepBarberOut(user: Customer | null) {
  if (user?.role === "barbeiro") redirect("/barbeiro");
}
