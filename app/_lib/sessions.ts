import { createHash, randomBytes } from "node:crypto";
import { and, eq, lt, ne } from "drizzle-orm";
import { orm, type Consent, type Role } from "./db";
import { sessions, users } from "./db-schema";
import { toCustomer, type Customer } from "./roles";

// Sessões de login: o cookie do site e o token Bearer do app usam a mesma
// tabela. O banco guarda só o hash do token. Consultas diretas (sem `readDb`),
// porque rodam em toda requisição.

export const SESSION_DAYS = 30;
/** Com menos que isso de validade, o uso renova a sessão para `SESSION_DAYS`. */
export const RENEW_BELOW_DAYS = 15;

const DAY_MS = 24 * 60 * 60 * 1000;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSessionToken(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_DAYS * DAY_MS;
  await orm.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, Date.now())));
  await orm.insert(sessions).values({ token: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}

/** Usuário da sessão, ou `null` se o token não vale, expirou ou a conta foi desativada. */
export async function findSessionUser(token: string): Promise<Customer | null> {
  if (!token) return null;
  const hash = hashToken(token);
  const [row] = await orm
    .select({ expiresAt: sessions.expiresAt, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.token, hash));
  const now = Date.now();
  if (!row || row.expiresAt <= now || row.user.disabledAt) return null;
  if (row.expiresAt - now < RENEW_BELOW_DAYS * DAY_MS) {
    await orm.update(sessions).set({ expiresAt: now + SESSION_DAYS * DAY_MS }).where(eq(sessions.token, hash));
  }
  return toCustomer({
    ...row.user,
    role: (row.user.role ?? undefined) as Role | undefined,
    consent: (row.user.consent ?? undefined) as Consent | undefined,
    professional: row.user.professional ?? undefined,
  });
}

export async function revokeSession(token: string) {
  await orm.delete(sessions).where(eq(sessions.token, hashToken(token)));
}

/** Encerra as sessões do usuário, menos a de `exceptToken` (se houver). */
export async function revokeUserSessions(userId: string, exceptToken?: string | null) {
  await orm
    .delete(sessions)
    .where(exceptToken ? and(eq(sessions.userId, userId), ne(sessions.token, hashToken(exceptToken))) : eq(sessions.userId, userId));
}

/**
 * Token da requisição. `Authorization: Bearer <token>` (app) tem prioridade
 * sobre o cookie (site); um Bearer malformado não cai no cookie. Cabeçalho de
 * outro tipo (ex.: Basic, posto por um proxy) é ignorado e vale o cookie.
 */
export function tokenFrom(authorization: string | null, cookie: string | null): string | null {
  const value = authorization?.trim() ?? "";
  if (!/^bearer(\s|$)/i.test(value)) return cookie;
  return /^Bearer\s+(\S+)$/i.exec(value)?.[1] ?? null;
}
