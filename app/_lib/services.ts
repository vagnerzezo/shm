import type { ProfessionalColor, StoredProfessional, StoredService } from "./db";

// Tipos e funções puras do catálogo (também usados no navegador). Os dados
// ficam no banco e são lidos por `catalog.ts`; aqui estão só os padrões de
// quando o banco ainda não tem catálogo salvo.

export type Service = StoredService;
export type Professional = StoredProfessional;

export const DEFAULT_SERVICES: Service[] = [
  { id: "barba-heitor", name: "Barba com Heitor", category: "Heitor", professional: "Heitor", durationMinutes: 45, priceCents: 6000 },
  { id: "barba-jimmy", name: "Barba com Jimmy", category: "Barbearia", professional: "Jimmy", durationMinutes: 45, priceCents: 5000 },
  { id: "barba-pigmentacao", name: "Barba I Pigmentação", category: "Barbearia", durationMinutes: 45, priceCents: 7000 },
  { id: "corte-heitor", name: "Corte com Heitor", category: "Heitor", professional: "Heitor", durationMinutes: 45, priceCents: 7000 },
  { id: "corte-jimmy", name: "Corte com Jimmy", category: "Barbearia", professional: "Jimmy", durationMinutes: 45, priceCents: 6500 },
  { id: "corte-barba-heitor", name: "Corte e barba com Heitor", category: "Heitor", professional: "Heitor", durationMinutes: 75, priceCents: 12000 },
  { id: "corte-barba-jimmy", name: "Corte e barba com Jimmy", category: "Barbearia", professional: "Jimmy", durationMinutes: 75, priceCents: 10000 },
  { id: "corte-barba-promo-heitor", name: "Corte e barba promocional com Heitor", category: "Heitor", professional: "Heitor", durationMinutes: 75, priceCents: 10000 },
  { id: "corte-esfoliacao", name: "Corte e esfoliação facial", category: "Barbearia", durationMinutes: 75, priceCents: 10000 },
];

export const DEFAULT_PROFESSIONALS: Professional[] = [
  { name: "Heitor", color: "blue" },
  { name: "Jimmy", color: "violet" },
];

export const PROFESSIONAL_COLORS: { id: ProfessionalColor; label: string }[] = [
  { id: "blue", label: "Azul" },
  { id: "violet", label: "Roxo" },
  { id: "emerald", label: "Verde" },
  { id: "amber", label: "Laranja" },
  { id: "rose", label: "Rosa" },
  { id: "cyan", label: "Ciano" },
];

/** Categorias na ordem em que aparecem no catálogo. */
export function categoriesOf(services: Service[]) {
  return [...new Set(services.map((s) => s.category))];
}

export function findService(services: Service[], id: string | undefined) {
  return services.find((s) => s.id === id);
}

export const isActiveService = (s: Service) => s.active !== false;

export function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}min`;
}

// "Corte com Heitor" -> "CH": primeira palavra + último nome próprio.
export function initials(name: string) {
  const words = name.split(" ").filter((w) => /^[A-ZÀ-Ú]/.test(w));
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1][0] : name.split(" ").at(-1)?.[0] ?? "";
  return (first + last).toUpperCase();
}
