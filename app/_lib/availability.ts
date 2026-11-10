// Disponibilidade simulada até existir um backend: gera horários
// determinísticos por serviço + dia, dentro do funcionamento configurado em
// /admin/configuracoes (dias, horário e períodos fechados).

import type { Closure, ScheduleSettings } from "./db";
import type { Service } from "./services";

export const TIME_ZONE = "America/Sao_Paulo";

/** Valores de antes de existir a tela de configurações. */
export const DEFAULT_SCHEDULE: ScheduleSettings = {
  openWeekdays: [1, 3, 4, 5, 6],
  openTime: "10:00",
  lastStartTime: "19:00",
  stepMinutes: 15,
  maxDaysAhead: 90,
  minNoticeMinutes: 0,
};

/** Tudo o que decide se um horário existe. Vem do banco e vai até o navegador. */
export type AvailabilityRules = { settings: ScheduleSettings; closures: Closure[] };

/** Intervalos possíveis entre um horário e o próximo, em minutos. */
export const STEP_OPTIONS = [15, 20, 30, 45, 60];

export type DaySlots = { date: string; times: string[] };

/**
 * Intervalo ocupado (em minutos do dia). Sem `professional`: é do próprio
 * cliente e bloqueia qualquer serviço (ele não está em dois lugares). Com
 * `professional`: é de outro cliente e só bloqueia o mesmo profissional
 * (`null` = serviços sem profissional fixo).
 */
export type Busy = { date: string; start: number; end: number; professional?: string | null };

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function toTime(minutes: number) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// Datas trafegam como "YYYY-MM-DD"; o meio-dia UTC evita virar o dia.
function parseDate(date: string) {
  return new Date(`${date}T12:00:00Z`);
}

/** 0 = domingo. */
export function weekdayOf(date: string) {
  return parseDate(date).getUTCDay();
}

/**
 * Período fechado que cobre `date`. Sem `professional`, só vale o fechamento do
 * estúdio todo; com ele, vale também o do profissional.
 */
export function closureOn(date: string, rules: AvailabilityRules, professional?: string) {
  return rules.closures.find(
    (c) => c.start <= date && date <= c.end && (!c.professional || c.professional === professional),
  );
}

/** Dia sem atendimento: fora dos dias de funcionamento ou num período fechado. */
export function isClosed(date: string, rules: AvailabilityRules, professional?: string) {
  return !rules.settings.openWeekdays.includes(weekdayOf(date)) || Boolean(closureOn(date, rules, professional));
}

export function addDays(date: string, days: number) {
  const d = parseDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Data e minuto atuais no fuso do estúdio. */
export function nowInStudio(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function getSlots(
  service: Pick<Service, "id" | "professional" | "durationMinutes">,
  date: string,
  now: { date: string; minutes: number },
  busy: Busy[],
  rules: AvailabilityRules,
): string[] {
  const { settings } = rules;
  if (date < now.date || date > addDays(now.date, settings.maxDaysAhead)) return [];
  if (isClosed(date, rules, service.professional)) return [];

  const duration = service.durationMinutes;
  const taken = busy.filter(
    (b) => b.date === date && (b.professional === undefined || b.professional === (service.professional ?? null)),
  );
  const times: string[] = [];
  const last = toMinutes(settings.lastStartTime);
  for (let m = toMinutes(settings.openTime); m <= last; m += settings.stepMinutes) {
    if (date === now.date && m <= now.minutes + settings.minNoticeMinutes) continue;
    if (taken.some((b) => m < b.end && b.start < m + duration)) continue;
    if (hash(`${service.id}|${date}|${m}`) % 6 === 0) times.push(toTime(m));
  }
  return times;
}

export function getSuggestedDays(
  service: Pick<Service, "id" | "professional" | "durationMinutes">,
  now: { date: string; minutes: number },
  busy: Busy[],
  rules: AvailabilityRules,
  count = 5,
): DaySlots[] {
  const days: DaySlots[] = [];
  // Procura além de 30 dias para achar horário mesmo depois de umas férias.
  for (let i = 0; days.length < count && i <= Math.min(rules.settings.maxDaysAhead, 60); i++) {
    const date = addDays(now.date, i);
    const times = getSlots(service, date, now, busy, rules);
    if (times.length > 0) days.push({ date, times });
  }
  return days;
}

/** Dias do mês "YYYY-MM", com `null` para as casas vazias antes do dia 1. */
export function monthGrid(month: string): (string | null)[] {
  const [y, m] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
}

export function addMonths(month: string, count: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + count, 1));
  return d.toISOString().slice(0, 7);
}

export function formatMonth(month: string) {
  const text = parseDate(`${month}-01`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatWeekday(date: string) {
  const text = parseDate(date).toLocaleDateString("pt-BR", {
    weekday: "long",
    timeZone: "UTC",
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatLongDate(date: string) {
  return parseDate(date).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "2026-10-22" -> "OUT" */
export function formatShortMonth(date: string) {
  return parseDate(date)
    .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
    .replace(".", "")
    .toUpperCase();
}
