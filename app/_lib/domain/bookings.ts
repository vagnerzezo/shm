import {
  formatLongDate,
  freeProfessionals,
  getSlots,
  isClosed,
  isRealDate,
  isTime,
  nowInStudio,
  pickProfessional,
  toMinutes,
  type Busy,
} from "../availability";
import { catalogOf } from "../catalog";
import { updateDb, type Db, type StoredReservation } from "../db";
import type { Scope } from "../access";
import { DomainError } from "../errors";
import { pushReservationNotice, RESCHEDULED_PREFIX } from "../notifications";
import { normalizeNewlines } from "./messages";
import { busyFrom, inScope, isCancelled, isPast, keepOrPick, professionalOf } from "../reservations";
import { roleOf } from "../roles";
import { rulesOf } from "../schedule";
import { findService, isActiveService, type Service } from "../services";

// Marcar, remarcar e cancelar. A conferência do horário e a gravação
// acontecem na mesma transação (`updateDb` tem trava), então duas pessoas não
// pegam o mesmo horário. E-mails, mensagens e redirecionamentos ficam com
// quem chama (Server Action ou rota da API).

export type BookingInput = { serviceId: string; date: string; time: string };

export const MAX_ITEMS = 10;
const NOTE_MAX = 300;

const invalid = (message: string, field?: string) =>
  new DomainError("validation", message, field ? { [field]: message } : undefined);
/** Observação sem espaços nas pontas, ou `undefined`. Acima do limite é erro no campo `note` (nunca corta). */
function cleanNote(note: unknown): string | undefined {
  const clean = typeof note === "string" ? normalizeNewlines(note).trim() : "";
  if (clean.length > NOTE_MAX) {
    const message = `A observação pode ter no máximo ${NOTE_MAX} caracteres.`;
    throw new DomainError("validation", message, { note: message });
  }
  return clean || undefined;
}

function assertDate(date: unknown): asserts date is string {
  if (!isRealDate(date)) throw invalid("Informe uma data válida (AAAA-MM-DD).", "date");
}

function assertTime(time: unknown): asserts time is string {
  if (!isTime(time)) throw invalid("Informe um horário válido (HH:MM).", "time");
}

/** Cliente marca um ou mais horários. Tudo ou nada. Devolve os ids, na ordem dos itens. */
export async function bookForCustomer(userId: string, items: BookingInput[], note?: unknown): Promise<string[]> {
  if (!Array.isArray(items) || items.length === 0) throw invalid("Escolha pelo menos um horário.", "items");
  if (items.length > MAX_ITEMS) throw invalid(`Marque no máximo ${MAX_ITEMS} horários por vez.`, "items");
  const keys = new Set<string>();
  for (const item of items) {
    if (!item || typeof item !== "object" || typeof item.serviceId !== "string") throw invalid("Informe o serviço.", "items");
    assertDate(item.date);
    assertTime(item.time);
    const key = `${item.serviceId}|${item.date}|${item.time}`;
    if (keys.has(key)) throw invalid("O mesmo horário aparece duas vezes.", "items");
    keys.add(key);
  }
  const cleanedNote = cleanNote(note);

  return updateDb((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user || user.disabledAt) throw new DomainError("forbidden", "Sua conta não pode marcar horários.");
    assertNoOverlap(items, catalogOf(db).services);
    // Barbeiro não agenda como cliente (para isso usa outra conta).
    if (roleOf(user) === "barbeiro") throw new DomainError("forbidden", "Conta de barbeiro não marca horários. Use uma conta de cliente.");
    const { services } = catalogOf(db);
    const rules = rulesOf(db);
    const now = nowInStudio();
    const busy: Busy[] = busyFrom(db.reservations, services, { ownerId: userId, from: now.date });
    const ids: string[] = [];
    for (const { serviceId, date, time } of items) {
      const service = findService(services, serviceId);
      if (!service || !isActiveService(service)) throw invalid("Esse serviço não está disponível.", "items");
      if (!getSlots(service, date, now, busy, rules).includes(time)) {
        throw new DomainError("slot_unavailable", "Um dos horários não está mais disponível. Remova-o e escolha outro.");
      }
      // Sem profissional fixo, vai o livre com menos atendimentos no dia.
      const professional = pickProfessional(service, date, time, busy, rules) ?? undefined;
      const id = crypto.randomUUID();
      db.reservations.push({
        id,
        userId,
        serviceId,
        priceCents: service.priceCents,
        professional,
        date,
        time,
        note: cleanedNote,
      });
      pushReservationNotice(db, "reserva_marcada", db.reservations.at(-1)!, userId);
      ids.push(id);
      // Os próximos itens do mesmo pedido enxergam este: o cliente e o profissional ficam ocupados.
      const start = toMinutes(time);
      const slot = { date, start, end: start + service.durationMinutes };
      busy.push(slot, { ...slot, professional: professional ?? null });
    }
    return ids;
  });
}

/** Itens do mesmo pedido que se sobrepõem são erro da lista (400), não horário ocupado (409). */
function assertNoOverlap(items: BookingInput[], services: Service[]) {
  const spans = items.flatMap(({ serviceId, date, time }) => {
    const service = findService(services, serviceId);
    if (!service) return []; // serviço inexistente é conferido depois
    const start = toMinutes(time);
    return [{ date, start, end: start + service.durationMinutes }];
  });
  for (const [i, a] of spans.entries()) {
    for (const b of spans.slice(i + 1)) {
      if (a.date === b.date && a.start < b.end && b.start < a.end) {
        throw invalid("Dois horários do pedido se sobrepõem. Remova um deles.", "items");
      }
    }
  }
}

function ownReservation(db: Db, userId: string, id: string) {
  const r = db.reservations.find((r) => r.id === id && r.userId === userId);
  if (!r || isCancelled(r)) throw new DomainError("not_found", "Reserva não encontrada.");
  return r;
}

/**
 * Cliente troca o dia/horário de uma reserva futura e, na mesma transação,
 * avisa o estúdio pelo chat. Devolve a reserva como era e o nome do serviço.
 */
export async function rescheduleForCustomer(userId: string, id: string, date: unknown, time: unknown) {
  assertDate(date);
  assertTime(time);
  return updateDb((db) => {
    const r = ownReservation(db, userId, id);
    const now = nowInStudio();
    if (isPast(r, now)) throw invalid("Esse horário já passou e não pode ser remarcado.");
    if (r.date === date && r.time === time) throw invalid("Escolha um dia ou horário diferente.");
    const { services } = catalogOf(db);
    const service = findService(services, r.serviceId);
    if (!service || !isActiveService(service)) {
      throw invalid("Esse serviço não está mais disponível para remarcar. Fale com o estúdio.");
    }
    const rules = rulesOf(db);
    const busy = busyFrom(db.reservations, services, { ownerId: userId, ignoreId: id, from: now.date });
    if (!getSlots(service, date, now, busy, rules).includes(time)) {
      throw new DomainError("slot_unavailable", "Esse horário não está mais disponível. Escolha outro.");
    }
    const before: StoredReservation = { ...r };
    Object.assign(r, { date, time, professional: keepOrPick(r.professional, service, date, time, busy, rules) });
    db.messages.push({
      id: crypto.randomUUID(),
      customerId: userId,
      from: "cliente",
      text: rescheduledText(service.name, before, date, time),
      createdAt: new Date().toISOString(),
    });
    pushReservationNotice(db, "reserva_remarcada", r, userId, { previousProfessional: professionalOf(before, service) });
    return { before, serviceName: service.name };
  });
}

/** Aviso no chat quando o cliente remarca (o estúdio fica sabendo). */
export function rescheduledText(serviceName: string, before: { date: string; time: string }, date: string, time: string) {
  return `${RESCHEDULED_PREFIX}${serviceName}: de ${formatLongDate(before.date)} às ${before.time} para ${formatLongDate(date)} às ${time}.`;
}

/** Cliente cancela uma reserva futura. Devolve a reserva como era. */
export async function cancelForCustomer(userId: string, id: string): Promise<StoredReservation> {
  return updateDb((db) => {
    const r = ownReservation(db, userId, id);
    if (isPast(r, nowInStudio())) throw invalid("Esse horário já passou e não pode ser cancelado.");
    const before: StoredReservation = { ...r };
    Object.assign(r, { cancelledAt: new Date().toISOString(), cancelledBy: "cliente" });
    pushReservationNotice(db, "reserva_cancelada", r, userId);
    return before;
  });
}

/**
 * Regras do estúdio para um horário: o dia não pode estar fechado e precisa
 * haver um profissional livre. Não valem a janela, a antecedência nem o
 * horário de funcionamento. Devolve quem atende.
 */
function adminSlot(
  db: Db,
  serviceId: string,
  date: string,
  time: string,
  { ignoreId, current, only }: { ignoreId?: string; current?: string; only?: string } = {},
) {
  const { services } = catalogOf(db);
  const service = findService(services, serviceId);
  if (!service) throw invalid("Serviço não encontrado.", "serviceId");
  // Barbeiro marcando pelo painel: só serviços dele, e quem atende é ele.
  if (only && service.professional && service.professional !== only) {
    throw invalid("Esse serviço é de outro profissional.", "serviceId");
  }
  const rules = rulesOf(db);
  if (isClosed(date, rules, service.professional)) {
    throw invalid(
      `A agenda está fechada nesse dia${service.professional ? ` para ${service.professional}` : ""}. Reabra o período em Configurações se precisar.`,
      "date",
    );
  }
  const busy = busyFrom(db.reservations, services, { ignoreId });
  const start = toMinutes(time);
  const end = start + service.durationMinutes;
  if (only && !service.professional) {
    if (!freeProfessionals(service, date, start, end, busy, rules).includes(only)) {
      throw new DomainError("slot_unavailable", `${only} não está livre nesse horário. Escolha outro.`);
    }
    return { service, professional: only };
  }
  if (freeProfessionals(service, date, start, end, busy, rules).length === 0) {
    if (!service.professional) {
      throw new DomainError(
        "slot_unavailable",
        "Nenhum profissional está livre nesse horário (agenda cheia ou período fechado). Escolha outro.",
      );
    }
    const conflict = db.reservations.find((r) => {
      const other = findService(services, r.serviceId);
      if (r.id === ignoreId || isCancelled(r) || r.date !== date || !other) return false;
      if (professionalOf(r, other) !== service.professional) return false;
      const otherStart = toMinutes(r.time);
      return start < otherStart + other.durationMinutes && otherStart < end;
    });
    const who = db.users.find((u) => u.id === conflict?.userId)?.name ?? "outro cliente";
    throw new DomainError(
      "slot_unavailable",
      `Esse horário bate com a reserva de ${who} às ${conflict?.time ?? time} com ${service.professional}.`,
    );
  }
  return { service, professional: keepOrPick(current, service, date, time, busy, rules) };
}

/** Estúdio marca para um cliente (pode ser em data passada, para registrar um atendimento). Devolve o id. */
export async function bookByAdmin(
  input: {
    customerId: string;
    serviceId: string;
    date: unknown;
    time: unknown;
    note?: unknown;
  },
  scope: Scope = { all: true },
  actorId?: string,
): Promise<string> {
  if (!isRealDate(input.date)) throw invalid("Escolha a data.", "date");
  if (!isTime(input.time)) throw invalid("Escolha o horário.", "time");
  const { customerId, serviceId, date, time } = input;
  const note = cleanNote(input.note);
  return updateDb((db) => {
    const customer = db.users.find((u) => u.id === customerId && roleOf(u) === "cliente");
    if (!customer) throw invalid("Escolha o cliente.", "customerId");
    if (customer.disabledAt) throw invalid("Esse cliente está desativado. Reative a conta antes de marcar.", "customerId");
    const listed = findService(catalogOf(db).services, serviceId);
    if (!listed || !isActiveService(listed)) throw invalid("Escolha um serviço ativo.", "serviceId");
    const only = scope.all ? undefined : scope.professional;
    const { service, professional } = adminSlot(db, serviceId, date, time, { only });
    const id = crypto.randomUUID();
    db.reservations.push({
      id,
      userId: customerId,
      serviceId,
      priceCents: service.priceCents,
      professional,
      date,
      time,
      note,
      createdBy: "admin",
    });
    pushReservationNotice(db, "reserva_marcada", db.reservations.at(-1)!, actorId);
    return id;
  });
}

/** Estúdio remarca uma reserva futura. Devolve a reserva como era. */
export async function rescheduleByAdmin(
  id: string,
  date: unknown,
  time: unknown,
  scope: Scope = { all: true },
  actorId?: string,
): Promise<StoredReservation> {
  if (!isRealDate(date)) throw invalid("Escolha a data.", "date");
  if (!isTime(time)) throw invalid("Escolha o horário.", "time");
  return updateDb((db) => {
    const r = db.reservations.find((r) => r.id === id);
    if (!r || isCancelled(r) || !inScope(db, r, scope)) throw new DomainError("not_found", "Reserva não encontrada.");
    if (isPast(r, nowInStudio())) throw invalid("Esse horário já passou e não pode ser remarcado.");
    if (r.date === date && r.time === time) throw invalid("Escolha um dia ou horário diferente.");
    const only = scope.all ? undefined : scope.professional;
    const { professional } = adminSlot(db, r.serviceId, date, time, { ignoreId: id, current: r.professional, only });
    const before: StoredReservation = { ...r };
    Object.assign(r, { date, time, professional });
    pushReservationNotice(db, "reserva_remarcada", r, actorId, {
      previousProfessional: professionalOf(before, findService(catalogOf(db).services, r.serviceId)),
    });
    return before;
  });
}
