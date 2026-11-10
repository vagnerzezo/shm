import { randomBytes } from "node:crypto";
import { appUrl } from "./email";
import { readDb, updateDb } from "./db";

// Link de descadastro dos e-mails de marketing. Cada cliente tem um código
// aleatório próprio, criado no primeiro envio; quem tem o link só consegue
// desligar os e-mails daquele cliente, nada mais.

/** Código do cliente, criado na primeira vez. `null` se o cliente não existe mais. */
export function unsubscribeTokenFor(userId: string) {
  return updateDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) return null;
    user.unsubscribeToken ??= randomBytes(24).toString("base64url");
    return user.unsubscribeToken;
  });
}

export function unsubscribeUrl(token: string) {
  return `${appUrl()}/descadastrar?t=${encodeURIComponent(token)}`;
}

/** Para a tela de descadastro: e-mail (parcialmente escondido) e situação atual. */
export async function findByUnsubscribeToken(token: string) {
  if (!token) return null;
  const user = (await readDb()).users.find((u) => u.unsubscribeToken === token);
  if (!user) return null;
  return { maskedEmail: maskEmail(user.email), subscribed: Boolean(user.consent?.email) };
}

/** Desliga só os e-mails de marketing. Devolve `false` se o link não vale. */
export function unsubscribeByToken(token: string) {
  return updateDb((db) => {
    const user = token ? db.users.find((u) => u.unsubscribeToken === token) : undefined;
    if (!user) return false;
    user.consent = { email: false, mensagem: user.consent?.mensagem ?? false };
    return true;
  });
}

/** "maria.silva@gmail.com" → "ma•••@gmail.com" */
function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}•••@${domain}`;
}
