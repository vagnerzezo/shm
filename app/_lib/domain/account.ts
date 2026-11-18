import { and, count, eq, gt, lt } from "drizzle-orm";
import { orm, purgeUser, readDb, updateDb, type User } from "../db";
import { loginAttempts } from "../db-schema";
import { DomainError } from "../errors";
import { completePasswordReset, startPasswordReset } from "../password-reset";
import { hashPassword, verifyPassword } from "../passwords";
import { parseProfile, type ProfileInput } from "../profile";
import { roleOf } from "../roles";
import { revokeUserSessions } from "../sessions";

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

export const PASSWORD_RULE = "A senha precisa ter de 8 a 100 caracteres.";

export function assertPassword(password: unknown, field = "password"): asserts password is string {
  if (typeof password !== "string" || password.length < 8 || password.length > 100) {
    throw new DomainError("validation", PASSWORD_RULE, { [field]: PASSWORD_RULE });
  }
}

/** Cria a conta de cliente. */
export async function registerCustomer(input: ProfileInput, password: unknown): Promise<User> {
  const profile = parseProfile(input);
  assertPassword(password);
  const passwordHash = await hashPassword(password);
  const user = await updateDb((db) => {
    if (db.users.some((u) => u.email === profile.email)) return null;
    const user: User = { id: crypto.randomUUID(), ...profile, passwordHash, createdAt: new Date().toISOString() };
    db.users.push(user);
    return user;
  });
  if (!user) {
    const message = "Já existe uma conta com esse e-mail.";
    throw new DomainError("email_taken", message, { email: message });
  }
  return user;
}

/** Atualiza os dados do próprio usuário. Campos não enviados ficam como estão. */
export async function updateOwnProfile(userId: string, input: ProfileInput): Promise<void> {
  const result = await updateDb((db) => {
    const current = db.users.find((u) => u.id === userId);
    if (!current) return "missing";
    const profile = parseProfile({
      name: input.name ?? current.name,
      phone: input.phone ?? current.phone,
      email: input.email ?? current.email,
      consent: input.consent ?? current.consent,
    });
    if (db.users.some((u) => u.email === profile.email && u.id !== userId)) return "taken";
    Object.assign(current, profile);
    return "ok";
  });
  if (result === "missing") throw new DomainError("not_found", "Conta não encontrada.");
  if (result === "taken") {
    const message = "Esse e-mail já está em uso em outra conta.";
    throw new DomainError("email_taken", message, { email: message });
  }
}

/** Lança `validation` no campo `current` se a senha atual não confere. */
export async function assertCurrentPassword(userId: string, current: unknown) {
  const user = (await readDb()).users.find((u) => u.id === userId);
  if (!user || typeof current !== "string" || !(await verifyPassword(current, user.passwordHash))) {
    const message = "A senha atual está incorreta.";
    throw new DomainError("validation", message, { current: message });
  }
}

/** Troca a própria senha e encerra as outras sessões (`keepToken` continua valendo). */
export async function changeOwnPassword(userId: string, current: unknown, next: unknown, keepToken: string | null) {
  await assertCurrentPassword(userId, current);
  assertPassword(next);
  if (next === current) {
    const message = "A nova senha precisa ser diferente da atual.";
    throw new DomainError("validation", message, { password: message });
  }
  const passwordHash = await hashPassword(next);
  await updateDb((db) => {
    const u = db.users.find((u) => u.id === userId);
    if (u) u.passwordHash = passwordHash;
  });
  await revokeUserSessions(userId, keepToken);
}

/** Cliente apaga a própria conta e todos os dados (LGPD). */
export async function deleteOwnAccount(userId: string, password: unknown): Promise<void> {
  const user = (await readDb()).users.find((u) => u.id === userId);
  if (!user) throw new DomainError("not_found", "Conta não encontrada.");
  if (roleOf(user) !== "cliente") {
    throw new DomainError("forbidden", "Essa conta não pode ser excluída por aqui.");
  }
  if (typeof password !== "string" || !(await verifyPassword(password, user.passwordHash))) {
    throw new DomainError("validation", "Senha incorreta.", { password: "Senha incorreta." });
  }
  await updateDb((db) => purgeUser(db, userId));
}

/** Nova senha a partir do código enviado por e-mail. Encerra as sessões abertas. */
export async function resetPasswordWithToken(token: unknown, password: unknown) {
  assertPassword(password);
  const user = await completePasswordReset(typeof token === "string" ? token : "", await hashPassword(password));
  if (!user) {
    const message = "Este link expirou ou já foi usado. Peça um novo.";
    throw new DomainError("validation", message, { token: message });
  }
  return user;
}

/** "Esqueci minha senha". Sempre termina igual, para não revelar quais e-mails têm conta. */
export async function requestPasswordResetFor(emailInput: unknown): Promise<void> {
  const email = normalizeEmail(emailInput);
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new DomainError("validation", "Informe um e-mail válido.", { email: "Informe um e-mail válido." });
  }
  await startPasswordReset(email);
}
