import { addDays, getSlots, nowInStudio, type DaySlots } from "../availability";
import { catalogOf } from "../catalog";
import { readDb } from "../db";
import { DomainError } from "../errors";
import { busyFrom, isCancelled } from "../reservations";
import { rulesOf } from "../schedule";
import { findService, isActiveService, type Service } from "../services";

// Leitura do catálogo e dos horários livres, para a API.

/** Serviços ativos agrupados por categoria, na ordem do catálogo. */
export async function servicesByCategory(): Promise<{ categories: { name: string; services: Service[] }[] }> {
  const { services, categories } = catalogOf(await readDb());
  const active = services.filter(isActiveService);
  return { categories: categories.map((name) => ({ name, services: active.filter((s) => s.category === name) })) };
}

/**
 * Horários livres de um serviço em cada dia de `from` a `to` (datas já
 * validadas). Com `userId`, as reservas do próprio cliente o ocupam; com
 * `rescheduleOf`, a reserva dele que vai ser remarcada não conta.
 */
export async function availabilityFor(input: {
  serviceId: string;
  from: string;
  to: string;
  userId?: string;
  rescheduleOf?: string;
}): Promise<{ serviceId: string; days: DaySlots[] }> {
  const { serviceId, from, to, userId, rescheduleOf } = input;
  const db = await readDb();
  const { services } = catalogOf(db);
  const service = findService(services, serviceId);
  if (!service || !isActiveService(service)) throw new DomainError("not_found", "Serviço não encontrado.");
  if (rescheduleOf !== undefined) {
    if (!userId) throw new DomainError("unauthenticated", "Entre na sua conta para remarcar.");
    const r = db.reservations.find((r) => r.id === rescheduleOf && r.userId === userId);
    if (!r || isCancelled(r)) throw new DomainError("not_found", "Reserva não encontrada.");
  }
  const rules = rulesOf(db);
  const now = nowInStudio();
  const busy = busyFrom(db.reservations, services, { ownerId: userId, ignoreId: rescheduleOf, from: now.date });
  const days: DaySlots[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    days.push({ date, times: getSlots(service, date, now, busy, rules) });
  }
  return { serviceId, days };
}
