import { createHash, randomBytes } from "node:crypto";
import { appUrl, emailProviderReady, sendEmail } from "./email";
import { escapeHtml } from "./email-html";
import { readDb, updateDb } from "./db";
import { getStudio } from "./studio";

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

  const studio = (await getStudio()).name;
  const first = user.name.split(" ")[0];
  try {
    await sendEmail({
      to: user.email,
      subject: `Redefinir sua senha — ${studio}`,
      text: `Olá, ${first}!\n\nPara criar uma nova senha, acesse:\n${link}\n\nO link vale por 1 hora e só pode ser usado uma vez. Se você não pediu, ignore este e-mail: sua senha continua a mesma.`,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#121212"><p>Olá, ${escapeHtml(first)}!</p><p>Para criar uma nova senha, clique no botão abaixo.</p><p><a href="${escapeHtml(link)}" style="display:inline-block;background:#121212;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Criar nova senha</a></p><p style="font-size:13px;color:#666">O link vale por 1 hora e só pode ser usado uma vez. Se você não pediu, ignore este e-mail: sua senha continua a mesma.</p></div>`,
      idempotencyKey: `redefinir-senha:${hashToken(token)}`,
    });
  } catch (error) {
    console.error("[redefinir-senha] Falha ao enviar:", error);
  }
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
