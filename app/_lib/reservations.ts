import { nowInStudio, toMinutes, type Busy } from "./availability";
import { catalogOf } from "./catalog";
import { readDb, updateDb, type StoredReservation } from "./db";
import { findService, type Service } from "./services";

export type Reservation = StoredReservation & { service: Service };

/** Reserva vista pelo estúdio: inclui quem marcou. */
export type AgendaReservation = Reservation & {
  customer: { id: string; name: string; phone: string; email: string };
};

/** Reservas do cliente, em ordem cronológica. */
export async function getReservations(userId: string): Promise<Reservation[]> {
  const db = await readDb();
  const { services } = catalogOf(db);
  return db.reservations
    .filter((r) => r.userId === userId)
    .flatMap((r) => {
      const service = findService(services, r.serviceId);
      return service ? [{ ...r, service: withPrice(service, r) }] : [];
    })
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

/** O serviço com o preço cobrado nesta reserva (o preço do catálogo pode ter mudado depois). */
function withPrice(service: Service, r: StoredReservation): Service {
  return r.priceCents === undefined ? service : { ...service, priceCents: r.priceCents };
}

export function isPast(r: { date: string; time: string }, now: { date: string; minutes: number }) {
  return r.date < now.date || (r.date === now.date && toMinutes(r.time) <= now.minutes);
}

/** Atendimento que aconteceu: horário passou e o cliente não foi marcado como falta. */
export function isDone(r: Pick<StoredReservation, "date" | "time" | "attendance">, now: { date: string; minutes: number }) {
  return isPast(r, now) && r.attendance !== "faltou";
}

export type ReservationStatus = "agendado" | "realizado" | "faltou";

export function statusOf(r: Pick<StoredReservation, "date" | "time" | "attendance">, now: { date: string; minutes: number }): ReservationStatus {
  if (!isPast(r, now)) return "agendado";
  return r.attendance === "faltou" ? "faltou" : "realizado";
}

export async function addReservations(reservations: Omit<StoredReservation, "id">[]) {
  await updateDb((db) => {
    db.reservations.push(...reservations.map((r) => ({ id: crypto.randomUUID(), ...r })));
  });
}

export async function removeReservation(userId: string, id: string) {
  await updateDb((db) => {
    db.reservations = db.reservations.filter((r) => !(r.id === id && r.userId === userId));
  });
}

/** Reservas de todos os clientes entre `from` e `to` (inclusive), em ordem cronológica. */
export async function getAgenda(from = "0000-01-01", to = "9999-12-31"): Promise<AgendaReservation[]> {
  const db = await readDb();
  const { services } = catalogOf(db);
  const users = new Map(db.users.map((u) => [u.id, u]));
  return db.reservations
    .filter((r) => r.date >= from && r.date <= to)
    .flatMap((r) => {
      const service = findService(services, r.serviceId);
      const user = users.get(r.userId);
      if (!service || !user) return [];
      const customer = { id: user.id, name: user.name, phone: user.phone, email: user.email };
      return [{ ...r, service: withPrice(service, r), customer }];
    })
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

/**
 * Reserva que ocupa o mesmo profissional no mesmo intervalo. Serviço sem
 * profissional fixo conflita com outros sem profissional fixo.
 */
export function findConflict(
  reservations: StoredReservation[],
  services: Service[],
  candidate: { serviceId: string; date: string; time: string; ignoreId?: string },
) {
  const service = findService(services, candidate.serviceId);
  if (!service) return null;
  const start = toMinutes(candidate.time);
  const end = start + service.durationMinutes;
  return (
    reservations.find((r) => {
      if (r.id === candidate.ignoreId || r.date !== candidate.date) return false;
      const other = findService(services, r.serviceId);
      if (!other || (other.professional ?? null) !== (service.professional ?? null)) return false;
      const otherStart = toMinutes(r.time);
      return start < otherStart + other.durationMinutes && otherStart < end;
    }) ?? null
  );
}

/**
 * Horários ocupados para o agendamento do cliente: as reservas dele (bloqueiam
 * tudo) e as dos outros clientes (bloqueiam só o mesmo profissional).
 * Sem `userId` (visitante), só as dos outros. `ignoreId`: a reserva que está
 * sendo remarcada, para o horário atual dela não bloquear os vizinhos.
 */
export async function getBookingBusy(userId?: string, ignoreId?: string): Promise<Busy[]> {
  const db = await readDb();
  const { services } = catalogOf(db);
  const today = nowInStudio().date;
  return db.reservations.flatMap((r) => {
    if (r.date < today || r.id === ignoreId) return [];
    const service = findService(services, r.serviceId);
    if (!service) return [];
    const start = toMinutes(r.time);
    const slot = { date: r.date, start, end: start + service.durationMinutes };
    return [r.userId === userId ? slot : { ...slot, professional: service.professional ?? null }];
  });
}
