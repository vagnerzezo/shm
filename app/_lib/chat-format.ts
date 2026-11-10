import { TIME_ZONE } from "./availability";

// Formatação da conversa, sem dependências de servidor (usada no cliente).

/** "Maria Souza" -> "MS" */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}

/** "2026-10-22T13:05:00Z" -> "10:05", no fuso do estúdio. */
export function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  });
}

/** Data (AAAA-MM-DD) do envio no fuso do estúdio, para agrupar por dia. */
export function dayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(iso));
}

export function formatDay(iso: string, now = new Date()) {
  const key = dayKey(iso);
  if (key === dayKey(now.toISOString())) return "Hoje";
  if (key === dayKey(new Date(now.getTime() - 86_400_000).toISOString())) return "Ontem";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    timeZone: TIME_ZONE,
  });
}

/** Horário na lista de clientes: hora se for hoje, senão o dia. */
export function formatListTime(iso: string) {
  const day = formatDay(iso);
  return day === "Hoje" ? formatClock(iso) : day;
}
