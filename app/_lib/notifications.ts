import type { Db, Notification } from "./db";
import type { Customer } from "./roles";

// Sino de notificações: cada acontecimento vira um aviso (gravado na mesma
// transação da ação). Quem recebe é decidido na leitura: o admin vê tudo, o
// barbeiro o que é do profissional dele, e ninguém vê o que ele mesmo fez.

export type { Notification, NotificationKind } from "./db";

/** Avisos que só o admin recebe. */
const ADMIN_ONLY = new Set<Notification["kind"]>(["cliente_novo", "falha_marketing", "falha_email"]);

/** Grava um aviso. Use dentro de uma `updateDb`. */
export function pushNotification(db: Db, n: Omit<Notification, "id" | "at">): void {
  db.notifications.push({ ...n, id: crypto.randomUUID(), at: new Date().toISOString() });
}

/** O aviso é para esta pessoa? */
export function isForUser(n: Notification, user: Customer): boolean {
  if (n.actorId && n.actorId === user.id) return false;
  if (user.role === "admin") return true;
  if (user.role !== "barbeiro" || !user.professional || ADMIN_ONLY.has(n.kind)) return false;
  if (n.kind === "dia_fechado") return !n.professional || n.professional === user.professional;
  return n.professional === user.professional;
}
