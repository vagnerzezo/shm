import { createHash, randomBytes } from "node:crypto";
import { appUrl, emailProviderReady } from "./email";
import { sendPasswordResetEmail } from "./email-templates/send";
import { readDb, updateDb } from "./db";

// "Esqueci minha senha": um link por e-mail com código de uso único que vale
// 1 hora. O banco guarda só o hash do código.

const TTL_MS = 60 * 60 * 1000;
/** Pedidos por conta por hora; acima disso, o pedido é ignorado em silêncio. */
const MAX_PER_HOUR = 3;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Cria o link e manda por e-mail. Não diz se o e-mail tem conta (quem chama mostra sempre a mesma mensagem). */
export async function startPasswordReset(email: string) {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const user = await updateDb((db) => {
    const user = db.users.find((u) => u.email === email && !u.disabledAt);
    if (!user) return null;
    const resets = (db.passwordResets ?? []).filter((r) => r.expiresAt > now || r.createdAt > now - TTL_MS);
    if (resets.filter((r) => r.userId === user.id && r.createdAt > now - TTL_MS).length >= MAX_PER_HOUR) {
      db.passwordResets = resets;
      return null;
    }
    // Só o link mais recente vale.
    db.passwordResets = [
      ...resets.filter((r) => r.userId !== user.id || r.usedAt),
      { tokenHash: hashToken(token), userId: user.id, createdAt: now, expiresAt: now + TTL_MS },
    ];
    return { id: user.id, name: user.name, email: user.email };
  });
  if (!user) return;

  const link = `${appUrl()}/redefinir-senha?token=${token}`;
  if (!emailProviderReady()) {
    // Sem Resend configurado, o link só aparece no terminal do servidor (útil no desenvolvimento).
    const log = process.env.NODE_ENV === "production" ? console.error : console.info;
    log(`[redefinir-senha] E-mail não configurado. Link para ${user.email}: ${link}`);
    return;
  }

  await sendPasswordResetEmail(user, link, TTL_MS / 60_000, `redefinir-senha:${hashToken(token)}`);
}

/** Dono de um link ainda válido, ou `null`. */
export async function findValidReset(token: string) {
  if (!token) return null;
  const db = await readDb();
  const reset = (db.passwordResets ?? []).find((r) => r.tokenHash === hashToken(token));
  if (!reset || reset.usedAt || reset.expiresAt < Date.now()) return null;
  const user = db.users.find((u) => u.id === reset.userId && !u.disabledAt);
  return user ? { userId: user.id, email: user.email } : null;
}

/** Troca a senha, gasta o link e derruba as sessões abertas. Devolve o usuário, ou `null` se o link não vale. */
export function completePasswordReset(token: string, passwordHash: string) {
  return updateDb((db) => {
    const now = Date.now();
    const reset = (db.passwordResets ?? []).find((r) => r.tokenHash === hashToken(token));
    if (!reset || reset.usedAt || reset.expiresAt < now) return null;
    const user = db.users.find((u) => u.id === reset.userId && !u.disabledAt);
    if (!user) return null;
    user.passwordHash = passwordHash;
    reset.usedAt = now;
    db.sessions = db.sessions.filter((s) => s.userId !== user.id);
    return { id: user.id, email: user.email, role: user.role };
  });
}
