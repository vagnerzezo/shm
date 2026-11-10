import { getSlots, toMinutes, toTime, type AvailabilityRules, type Busy } from "./availability";
import { findService, isActiveService, type Service } from "./services";

// Enquanto não há backend, a reserva em andamento viaja na URL como
// `?item=<servico>_<AAAA-MM-DD>_<HH:MM>`, repetido para cada serviço.

export type BookingItem = {
  key: string;
  service: Service;
  date: string;
  time: string;
};

export function itemKey(serviceId: string, date: string, time: string) {
  return `${serviceId}_${date}_${time}`;
}

export function itemsQuery(keys: string[]) {
  const params = new URLSearchParams();
  for (const key of keys) params.append("item", key);
  return params.toString();
}

/** Monta `path?item=...`, sem `?` quando não há itens. */
export function withItems(path: string, keys: string[]) {
  const query = itemsQuery(keys);
  if (!query) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${query}`;
}

export function toKeys(raw: string | string[] | undefined) {
  const keys = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
  return [...new Set(keys)];
}

export function busyOf(items: { service: Service; date: string; time: string }[]): Busy[] {
  return items.map(({ service, date, time }) => {
    const start = toMinutes(time);
    return { date, start, end: start + service.durationMinutes };
  });
}

/**
 * Lê os itens da URL, descartando os inválidos, repetidos, já indisponíveis
 * ou que conflitam com `busy` (reservas existentes) ou com um item anterior.
 */
export function parseItems(
  raw: string | string[] | undefined,
  now: { date: string; minutes: number },
  busy: Busy[],
  rules: AvailabilityRules,
  services: Service[],
): BookingItem[] {
  const items: BookingItem[] = [];
  for (const key of toKeys(raw)) {
    const [serviceId, date, time] = key.split("_");
    const service = findService(services, serviceId);
    if (!service || !isActiveService(service) || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) continue;
    if (!getSlots(service, date, now, [...busy, ...busyOf(items)], rules).includes(time)) continue;
    items.push({ key, service, date, time });
  }
  return items;
}

export function endTime(time: string, durationMinutes: number) {
  return toTime(toMinutes(time) + durationMinutes);
}
