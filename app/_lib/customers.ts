import { roleOf } from "./auth";
import { nowInStudio } from "./availability";
import { readDb, type Consent } from "./db";
import { catalogOf } from "./catalog";
import { isCancelled, isDone, isPast } from "./reservations";
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

export async function getCustomers(): Promise<CustomerSummary[]> {
  const db = await readDb();
  const now = nowInStudio();
  const { services } = catalogOf(db);
  const getService = (id: string) => findService(services, id);
  const byUser = new Map<string, typeof db.reservations>();
  for (const r of db.reservations) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r]);

  return db.users
    .filter((u) => roleOf(u) === "cliente")
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

export async function getCustomer(id: string) {
  return (await getCustomers()).find((c) => c.id === id) ?? null;
}
