import { and, count, eq, gt, lt } from "drizzle-orm";
import { orm, readDb, type User } from "../db";
import { loginAttempts } from "../db-schema";
import { DomainError } from "../errors";
import { verifyPassword } from "../passwords";

// Conta: login, cadastro, perfil, senha e exclusão. Usado pelas Server
// Actions do site e pelas rotas da API.

export const MAX_LOGIN_FAILURES = 10;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export const normalizeEmail = (email: unknown) => String(email ?? "").trim().toLowerCase();

/**
 * Confere e-mail e senha. Erra igual para e-mail inexistente e senha errada
 * (não revela quais e-mails têm conta) e bloqueia o e-mail por um tempo
 * depois de muitos erros seguidos.
 */
export async function authenticate(emailInput: string, password: string): Promise<User> {
  const email = normalizeEmail(emailInput);
  const since = Date.now() - LOGIN_WINDOW_MS;
  const [{ failures }] = await orm
    .select({ failures: count() })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.email, email), gt(loginAttempts.at, since)));
  if (failures >= MAX_LOGIN_FAILURES) {
    throw new DomainError("rate_limited", "Muitas tentativas. Tente de novo em alguns minutos.");
  }

  const user = (await readDb()).users.find((u) => u.email === email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    await orm.delete(loginAttempts).where(lt(loginAttempts.at, since));
    await orm.insert(loginAttempts).values({ email, at: Date.now() });
    throw new DomainError("invalid_credentials", "E-mail ou senha incorretos.");
  }
  // Só depois da senha certa, para não revelar a situação de contas alheias.
  if (user.disabledAt) throw new DomainError("account_disabled", "Sua conta está desativada. Fale com o estúdio.");
  await orm.delete(loginAttempts).where(eq(loginAttempts.email, email));
  return user;
}
