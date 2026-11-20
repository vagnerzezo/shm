import { catalogOf } from "./catalog";
import type { Db, Notification, StoredReservation } from "./db";
import { shortDate } from "./format";
import { professionalOf } from "./reservations";
import { findService } from "./services";
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

/**
 * Aviso de reserva marcada, remarcada ou cancelada. O texto diz quem fez:
 * "Ana marcou Corte com Heitor · 25/11 10:00" (cliente) ou
 * "Heitor marcou Corte com Heitor para Ana · 25/11 10:00" (equipe).
 */
export function pushReservationNotice(
  db: Db,
  kind: "reserva_marcada" | "reserva_remarcada" | "reserva_cancelada",
  r: StoredReservation,
  actorId: string | undefined,
  options: { customerName?: string; keepCustomer?: boolean } = {},
): void {
  const service = findService(catalogOf(db).services, r.serviceId);
  const customerName = options.customerName ?? db.users.find((u) => u.id === r.userId)?.name ?? "Cliente";
  const actor = actorId ? db.users.find((u) => u.id === actorId) : undefined;
  const verb = { reserva_marcada: "marcou", reserva_remarcada: "remarcou", reserva_cancelada: "cancelou" }[kind];
  const when = `${shortDate(r.date, { year: false })} ${r.time}`;
  const what = service?.name ?? "um horário";
  const byCustomer = !actor || actor.id === r.userId;
  const text = byCustomer
    ? `${customerName} ${verb} ${what} · ${when}`
    : `${actor.name.split(" ")[0]} ${verb} ${what} para ${customerName} · ${when}`;
  pushNotification(db, {
    kind,
    actorId,
    professional: professionalOf(r, service) ?? undefined,
    ...(options.keepCustomer !== false && { customerId: r.userId }),
    reservationId: r.id,
    date: r.date,
    text,
  });
}
