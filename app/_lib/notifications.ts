import { scopeOf } from "./access";
import { agendaHref, weekStart } from "./agenda";
import { nowInStudio } from "./availability";
import { catalogOf } from "./catalog";
import { customersFrom } from "./customers";
import { readDb, updateDb, type Db, type Notification, type StoredReservation } from "./db";
import { shortDate } from "./format";
import { agendaFrom, professionalOf, statusOf } from "./reservations";
import { findService } from "./services";
import type { Customer } from "./roles";

/** Começo da mensagem automática que o cliente manda ao remarcar (ver `rescheduledText`). */
export const RESCHEDULED_PREFIX = "Remarquei ";

// Sino de notificações: cada acontecimento vira um aviso (gravado na mesma
// transação da ação). Quem recebe é decidido na leitura: o admin vê tudo, o
// barbeiro o que é do profissional dele, e ninguém vê o que ele mesmo fez.

export type { Notification, NotificationKind } from "./db";

/** Avisos que só o admin recebe. */
const ADMIN_ONLY = new Set<Notification["kind"]>(["cliente_novo", "falha_marketing", "falha_email"]);

/** Grava um aviso e apaga os com mais de 30 dias (o sino não mostra e a tabela não cresce). Use dentro de uma `updateDb`. */
export function pushNotification(db: Db, n: Omit<Notification, "id" | "at">): void {
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  db.notifications = db.notifications.filter((x) => x.at > cutoff);
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
  options: { customerName?: string; keepCustomer?: boolean; previousProfessional?: string | null } = {},
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
  const professional = professionalOf(r, service) ?? undefined;
  const notice = {
    kind,
    actorId,
    ...(options.keepCustomer !== false && { customerId: r.userId }),
    reservationId: r.id,
    date: r.date,
    text,
  };
  pushNotification(db, { ...notice, professional });
  // Remarcação que trocou de profissional: quem atendia também fica sabendo (o horário saiu da agenda dele).
  const previous = options.previousProfessional ?? undefined;
  if (previous && previous !== professional) pushNotification(db, { ...notice, professional: previous });
}

const DAY_MS = 86_400_000;

/** Data e hora do estúdio (São Paulo, UTC−3, sem horário de verão desde 2019) como instante ISO. */
const studioInstant = (date: string, time: string) => new Date(`${date}T${time}:00-03:00`).toISOString();
const WINDOW_DAYS = 30;
const MAX_ITEMS = 30;

export type BellItem = { id: string; text: string; at: string; href: string; unseen: boolean };

/** Para onde cada aviso leva. */
export function hrefOf(n: Notification): string {
  switch (n.kind) {
    case "reserva_marcada":
    case "reserva_remarcada":
    case "reserva_cancelada":
      return n.date ? agendaHref("dia", n.date, n.kind === "reserva_cancelada" ? undefined : n.reservationId) : "/admin/agenda";
    case "dia_fechado":
      return n.date ? agendaHref("dia", n.date) : "/admin/agenda";
    case "falha_marketing":
      return "/admin/marketing/historico?status=falha";
    case "cliente_novo":
    case "falha_email":
      return n.customerId ? `/admin/clientes/${n.customerId}` : "/admin/clientes";
  }
}

/**
 * O sino da pessoa: avisos dela (últimos 30 dias), mensagens de clientes do
 * escopo dela e um item "Confirme quem veio" quando houver horários desta
 * semana sem veio/faltou. Mais recentes primeiro, até 30.
 */
export async function getBell(user: Customer, preloaded?: Db): Promise<{ unseen: number; items: BellItem[] }> {
  const staff = user.role === "admin" || (user.role === "barbeiro" && Boolean(user.professional));
  if (!staff) return { unseen: 0, items: [] };
  const scope = scopeOf(user);
  // A moldura do painel passa o banco que já leu: uma leitura só por tela.
  const db = preloaded ?? (await readDb());
  const since = new Date(Date.now() - WINDOW_DAYS * DAY_MS).toISOString();
  const seenAt = db.users.find((u) => u.id === user.id)?.notificationsSeenAt;
  const seen = seenAt && seenAt > since ? seenAt : since;
  const items: Omit<BellItem, "unseen">[] = [];

  for (const n of db.notifications) {
    if (n.at > since && isForUser(n, user)) items.push({ id: n.id, text: n.text, at: n.at, href: hrefOf(n) });
  }

  const allowed = scope.all ? null : new Set(customersFrom(db, scope, "ficha").map((c) => c.id));
  const names = new Map(db.users.map((u) => [u.id, u.name]));
  // Ao remarcar, o cliente gera um aviso e uma mensagem automática no chat, gravados juntos:
  // o sino mostra só o aviso (que leva à agenda). A mensagem continua no chat.
  const rescheduledBy = db.notifications
    .filter((n) => n.kind === "reserva_remarcada" && n.actorId && n.at > since)
    .map((n) => ({ customerId: n.actorId!, at: Date.parse(n.at) }));
  const isRescheduleEcho = (m: { customerId: string; createdAt: string; text: string }) =>
    m.text.startsWith(RESCHEDULED_PREFIX) &&
    rescheduledBy.some((r) => r.customerId === m.customerId && Math.abs(r.at - Date.parse(m.createdAt)) <= 2000);
  for (const m of db.messages) {
    if (m.from !== "cliente" || m.createdAt <= since || (allowed && !allowed.has(m.customerId))) continue;
    if (isRescheduleEcho(m)) continue;
    items.push({
      id: `msg-${m.id}`,
      text: `Mensagem de ${names.get(m.customerId) ?? "cliente"}: ${m.text.length > 60 ? `${m.text.slice(0, 60)}…` : m.text}`,
      at: m.createdAt,
      href: `/admin/chat?cliente=${m.customerId}`,
    });
  }

  // Horários desta semana que já passaram e estão sem veio/faltou: um item só, com a contagem.
  const now = nowInStudio();
  const pending = agendaFrom(db, weekStart(now.date), now.date, { scope }).filter(
    (r) => statusOf(r, now) !== "agendado" && !r.attendance,
  );
  if (pending.length > 0) {
    const latest = pending.at(-1)!;
    items.push({
      id: "confirme-quem-veio",
      text: `Confirme quem veio: ${pending.length} ${pending.length === 1 ? "horário" : "horários"} sem marcação`,
      at: studioInstant(latest.date, latest.time),
      href: agendaHref("dia", latest.date, latest.id),
    });
  }

  const sorted = items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX_ITEMS);
  const shown = sorted.map((i) => ({ ...i, unseen: i.at > seen }));
  return { unseen: shown.filter((i) => i.unseen).length, items: shown };
}

/**
 * Abrir o sino: o que a tela mostrou passa a ser visto. `upTo` é o horário do
 * aviso mais novo da lista aberta, para não marcar um que chegou depois e não
 * apareceu. Sem ele (ou no futuro, ou inválido), vale agora. Nunca volta atrás.
 */
export async function markBellSeen(userId: string, upTo?: string): Promise<void> {
  const now = new Date().toISOString();
  const valid = typeof upTo === "string" && !Number.isNaN(Date.parse(upTo));
  const at = valid ? new Date(Math.min(Date.parse(upTo), Date.parse(now))).toISOString() : now;
  await updateDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (user && !(user.notificationsSeenAt && user.notificationsSeenAt >= at)) user.notificationsSeenAt = at;
  });
}
