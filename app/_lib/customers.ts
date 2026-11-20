import type { Scope } from "./access";
import { roleOf } from "./roles";
import { nowInStudio } from "./availability";
import { readDb, type Consent, type Db } from "./db";
import { catalogOf } from "./catalog";
import { isCancelled, isDone, isPast, professionalOf } from "./reservations";
import { findService } from "./services";

/** Cliente visto pelo admin, com os números das reservas dele. */
export type CustomerSummary = {
  id: string;
  name: string;
  phone: string;
  email: string;
  consent: Consent;
  adminNote: string;
  createdAt: string;
  disabledAt: string | null;
  visits: number;
  /** Faltas marcadas pelo admin. */
  missed: number;
  /** Reservas canceladas (pelo cliente ou pelo estúdio). */
  cancelled: number;
  spentCents: number;
  lastVisit: { date: string; time: string; serviceName: string } | null;
  nextBooking: { date: string; time: string; serviceName: string } | null;
};

/**
 * Clientes com os números das reservas. Com escopo de barbeiro, os números
 * contam só as reservas com ele, e a lista traz só quem ele já atendeu
 * (modo `"lista"`); `getCustomer` usa `"ficha"`: qualquer reserva com ele ou
 * cadastrado por ele.
 */
export async function getCustomers(scope?: Scope, mode: "lista" | "ficha" = "lista"): Promise<CustomerSummary[]> {
  return customersFrom(await readDb(), scope, mode);
}

/** Igual a `getCustomers`, sobre um banco já lido. */
export function customersFrom(db: Db, scope?: Scope, mode: "lista" | "ficha" = "lista"): CustomerSummary[] {
  const now = nowInStudio();
  const { services } = catalogOf(db);
  const getService = (id: string) => findService(services, id);
  const mine = (r: (typeof db.reservations)[number]) => {
    if (!scope || scope.all) return true;
    const service = getService(r.serviceId);
    return Boolean(service) && professionalOf(r, service!) === scope.professional;
  };
  const byUser = new Map<string, typeof db.reservations>();
  for (const r of db.reservations.filter(mine)) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r]);
  const inScope = (u: (typeof db.users)[number]) => {
    if (!scope || scope.all) return true;
    if (mode === "lista") return (byUser.get(u.id) ?? []).some((r) => isDone(r, now));
    return byUser.has(u.id) || u.createdBy === scope.userId;
  };

  return db.users
    .filter((u) => roleOf(u) === "cliente" && inScope(u))
    .map((u) => {
      const all = byUser.get(u.id) ?? [];
      const reservations = all
        .filter((r) => !isCancelled(r))
        .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
      const past = reservations.filter((r) => isDone(r, now));
      const missed = reservations.filter((r) => isPast(r, now) && r.attendance === "faltou").length;
      const upcoming = reservations.filter((r) => !isPast(r, now));
      const brief = (r?: (typeof reservations)[number]) =>
        r ? { date: r.date, time: r.time, serviceName: getService(r.serviceId)?.name ?? "Serviço removido" } : null;
      return {
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        consent: u.consent ?? { email: false, mensagem: false },
        adminNote: u.adminNote ?? "",
        createdAt: u.createdAt,
        disabledAt: u.disabledAt ?? null,
        visits: past.length,
        missed,
        cancelled: all.length - reservations.length,
        spentCents: past.reduce((sum, r) => sum + (r.priceCents ?? getService(r.serviceId)?.priceCents ?? 0), 0),
        lastVisit: brief(past.at(-1)),
        nextBooking: brief(upcoming[0]),
      };
    });
}

/** Um cliente, ou `null` se não existe ou está fora do escopo. */
export async function getCustomer(id: string, scope?: Scope) {
  return (await getCustomers(scope, "ficha")).find((c) => c.id === id) ?? null;
}

/** Todos os clientes ativos, só com o que a busca de "Novo horário" precisa (sem histórico). */
export async function getCustomerPicklist(): Promise<{ id: string; name: string; phone: string }[]> {
  return (await readDb()).users
    .filter((u) => roleOf(u) === "cliente" && !u.disabledAt)
    .map((u) => ({ id: u.id, name: u.name, phone: u.phone }));
}
