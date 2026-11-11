import { freeProfessionals, nowInStudio, pickProfessional, toMinutes, type AvailabilityRules, type Busy } from "./availability";
import { catalogOf } from "./catalog";
import { readDb, updateDb, type Role, type StoredReservation } from "./db";
import { findService, type Service } from "./services";

export type Reservation = StoredReservation & { service: Service };

/** Reserva vista pelo estúdio: inclui quem marcou. */
export type AgendaReservation = Reservation & {
  customer: { id: string; name: string; phone: string; email: string };
};

export const isCancelled = (r: Pick<StoredReservation, "cancelledAt">) => Boolean(r.cancelledAt);

/** Quem atende a reserva. `null`: reserva antiga de serviço sem profissional fixo. */
export function professionalOf(r: Pick<StoredReservation, "professional">, service: Pick<Service, "professional"> | undefined) {
  return r.professional ?? service?.professional ?? null;
}

/** Reservas ativas do cliente (sem as canceladas), em ordem cronológica. */
export async function getReservations(userId: string): Promise<Reservation[]> {
  const db = await readDb();
  const { services } = catalogOf(db);
  return db.reservations
    .filter((r) => r.userId === userId && !isCancelled(r))
    .flatMap((r) => {
      const service = findService(services, r.serviceId);
      return service ? [{ ...r, service: asBooked(service, r) }] : [];
    })
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

/**
 * O serviço como foi marcado nesta reserva: com o preço cobrado (o do catálogo
 * pode ter mudado depois) e com o profissional que atende.
 */
function asBooked(service: Service, r: StoredReservation): Service {
  const professional = professionalOf(r, service) ?? undefined;
  return { ...service, priceCents: r.priceCents ?? service.priceCents, professional };
}

export function isPast(r: { date: string; time: string }, now: { date: string; minutes: number }) {
  return r.date < now.date || (r.date === now.date && toMinutes(r.time) <= now.minutes);
}

type StatusFields = Pick<StoredReservation, "date" | "time" | "attendance" | "cancelledAt">;

/** Atendimento que aconteceu: não foi cancelado, o horário passou e o cliente não foi marcado como falta. */
export function isDone(r: StatusFields, now: { date: string; minutes: number }) {
  return !isCancelled(r) && isPast(r, now) && r.attendance !== "faltou";
}

export type ReservationStatus = "agendado" | "realizado" | "faltou" | "cancelada";

export function statusOf(r: StatusFields, now: { date: string; minutes: number }): ReservationStatus {
  if (isCancelled(r)) return "cancelada";
  if (!isPast(r, now)) return "agendado";
  return r.attendance === "faltou" ? "faltou" : "realizado";
}

/** Devolve os ids criados, na mesma ordem. */
export async function addReservations(reservations: Omit<StoredReservation, "id">[]) {
  const created = reservations.map((r) => ({ id: crypto.randomUUID(), ...r }));
  await updateDb((db) => {
    db.reservations.push(...created);
  });
  return created.map((r) => r.id);
}

/**
 * Marca a reserva como cancelada (não apaga: fica no histórico). Devolve a
 * reserva como estava antes, ou `null` se ela não existe ou já estava cancelada.
 */
export async function markCancelled(
  id: string,
  by: Role,
  options: { userId?: string; reason?: string } = {},
): Promise<StoredReservation | null> {
  return updateDb((db) => {
    const r = db.reservations.find((r) => r.id === id && (!options.userId || r.userId === options.userId));
    if (!r || isCancelled(r)) return null;
    const before = { ...r };
    Object.assign(r, { cancelledAt: new Date().toISOString(), cancelledBy: by, cancelReason: options.reason || undefined });
    return before;
  });
}

/**
 * Reservas de todos os clientes entre `from` e `to` (inclusive), em ordem
 * cronológica. As canceladas só vêm com `includeCancelled` (histórico).
 */
export async function getAgenda(
  from = "0000-01-01",
  to = "9999-12-31",
  { includeCancelled = false } = {},
): Promise<AgendaReservation[]> {
  const db = await readDb();
  const { services } = catalogOf(db);
  const users = new Map(db.users.map((u) => [u.id, u]));
  return db.reservations
    .filter((r) => r.date >= from && r.date <= to && (includeCancelled || !isCancelled(r)))
    .flatMap((r) => {
      const service = findService(services, r.serviceId);
      const user = users.get(r.userId);
      if (!service || !user) return [];
      const customer = { id: user.id, name: user.name, phone: user.phone, email: user.email };
      return [{ ...r, service: asBooked(service, r), customer }];
    })
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

/**
 * Horários ocupados pelas reservas ativas a partir de `from`. As de `ownerId`
 * vêm sem profissional (bloqueiam o próprio cliente em qualquer serviço); as
 * outras ocupam quem atende. `ignoreId`: a reserva que está sendo remarcada,
 * para o horário atual dela não bloquear os vizinhos.
 */
export function busyFrom(
  reservations: StoredReservation[],
  services: Service[],
  { ownerId, ignoreId, from = "0000-01-01" }: { ownerId?: string; ignoreId?: string; from?: string } = {},
): Busy[] {
  return reservations.flatMap((r) => {
    if (r.date < from || r.id === ignoreId || isCancelled(r)) return [];
    const service = findService(services, r.serviceId);
    if (!service) return [];
    const start = toMinutes(r.time);
    const slot = { date: r.date, start, end: start + service.durationMinutes };
    return [r.userId === ownerId ? slot : { ...slot, professional: professionalOf(r, service) }];
  });
}

/** Horários ocupados para o agendamento do cliente (sem `userId`: visitante). */
export async function getBookingBusy(userId?: string, ignoreId?: string): Promise<Busy[]> {
  const db = await readDb();
  return busyFrom(db.reservations, catalogOf(db).services, { ownerId: userId, ignoreId, from: nowInStudio().date });
}

/**
 * Quem atende depois de remarcar: num serviço sem profissional fixo, continua
 * o mesmo se ele estiver livre no novo horário; senão, o livre com menos
 * atendimentos no dia. `undefined`: ninguém livre (ou estúdio sem profissionais).
 */
export function keepOrPick(
  current: string | undefined,
  service: Pick<Service, "professional" | "durationMinutes">,
  date: string,
  time: string,
  busy: Busy[],
  rules: AvailabilityRules,
): string | undefined {
  const start = toMinutes(time);
  const free = freeProfessionals(service, date, start, start + service.durationMinutes, busy, rules);
  if (current && free.includes(current)) return current;
  return pickProfessional(service, date, time, busy, rules) ?? undefined;
}
