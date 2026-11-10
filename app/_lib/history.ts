import { isDone, statusOf, type AgendaReservation } from "./reservations";

// Filtros do histórico do admin. Chegam pela URL, então tudo é validado aqui.

export const PAGE_SIZE = 25;

/** Valor do filtro para serviços sem profissional fixo. */
export const NO_PROFESSIONAL = "estudio";

export const statuses = [
  { id: "realizados", label: "Realizados" },
  { id: "proximos", label: "Próximos" },
  { id: "faltas", label: "Faltas" },
] as const;

const statusFilter = { realizados: "realizado", proximos: "agendado", faltas: "faltou" } as const;

export type HistoryFilters = {
  q: string;
  cliente: string;
  profissional: string;
  situacao: string;
  de: string;
  ate: string;
  pagina: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");

export function parseFilters(params: Record<string, string | string[] | undefined>): HistoryFilters {
  const profissional = one(params.profissional);
  const situacao = one(params.situacao);
  const de = one(params.de);
  const ate = one(params.ate);
  return {
    q: one(params.q).slice(0, 100),
    cliente: one(params.cliente),
    // Validado contra a lista de profissionais na tela; aqui só limita o tamanho.
    profissional: profissional.slice(0, 60),
    situacao: statuses.some((s) => s.id === situacao) ? situacao : "",
    de: DATE_RE.test(de) ? de : "",
    ate: DATE_RE.test(ate) ? ate : "",
    pagina: Math.max(1, Math.floor(Number(one(params.pagina))) || 1),
  };
}

/** URL do histórico com os filtros atuais, trocando só o que vier em `change`. */
export function historyHref(filters: HistoryFilters, change: Partial<HistoryFilters> = {}) {
  const next = { ...filters, pagina: 1, ...change };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value && !(key === "pagina" && value === 1)) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `/admin/historico?${query}` : "/admin/historico";
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Aplica os filtros e devolve do mais recente para o mais antigo. */
export function filterHistory(
  reservations: AgendaReservation[],
  filters: HistoryFilters,
  now: { date: string; minutes: number },
) {
  const q = normalize(filters.q);
  const digits = filters.q.replace(/\D/g, "");
  return reservations
    .filter((r) => {
      if (filters.cliente && r.customer.id !== filters.cliente) return false;
      if (filters.de && r.date < filters.de) return false;
      if (filters.ate && r.date > filters.ate) return false;
      if (filters.profissional && (r.service.professional ?? NO_PROFESSIONAL) !== filters.profissional) return false;
      if (filters.situacao && statusOf(r, now) !== statusFilter[filters.situacao as keyof typeof statusFilter]) {
        return false;
      }
      if (q) {
        const text = normalize(`${r.customer.name} ${r.customer.email} ${r.service.name}`);
        if (!text.includes(q) && !(digits.length >= 3 && r.customer.phone.includes(digits))) return false;
      }
      return true;
    })
    .reverse();
}

export function summarize(reservations: AgendaReservation[], now: { date: string; minutes: number }) {
  const done = reservations.filter((r) => isDone(r, now));
  return {
    total: reservations.length,
    customers: new Set(reservations.map((r) => r.customer.id)).size,
    done: done.length,
    missed: reservations.filter((r) => statusOf(r, now) === "faltou").length,
    // Só o que já foi realizado conta como faturado (faltas ficam de fora).
    revenueCents: done.reduce((sum, r) => sum + r.service.priceCents, 0),
  };
}
