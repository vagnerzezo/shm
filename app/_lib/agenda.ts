import {
  addDays,
  addMonths,
  formatMonth,
  monthGrid,
  toMinutes,
  weekdayOf,
} from "./availability";
import type { ProfessionalColor, ScheduleSettings } from "./db";
import type { AgendaReservation } from "./reservations";
import type { Professional } from "./services";

// Regras da agenda do admin: visões, intervalos de datas e posição dos
// eventos na grade de horários. Sem dependências de servidor.

export type AgendaView = "dia" | "semana" | "mes";

export const views: { id: AgendaView; label: string }[] = [
  { id: "dia", label: "Dia" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
];

export function parseView(raw: unknown): AgendaView {
  return raw === "dia" || raw === "mes" ? raw : "semana";
}

export function parseDate(raw: unknown, fallback: string) {
  return typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) && !isNaN(Date.parse(raw))
    ? raw
    : fallback;
}

export function agendaHref(view: AgendaView, date: string, reservationId?: string) {
  const params = new URLSearchParams({ visao: view, data: date });
  if (reservationId) params.set("reserva", reservationId);
  return `/admin/agenda?${params}`;
}

/** Domingo da semana de `date`. */
export function weekStart(date: string) {
  return addDays(date, -weekdayOf(date));
}

export function weekDays(date: string) {
  const start = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Grade do mês com semanas completas: inclui os dias do mês anterior e do seguinte. */
export function monthWeeks(month: string) {
  const days = monthGrid(month);
  const first = `${month}-01`;
  const lead = days.findIndex((d) => d !== null);
  const total = Math.ceil(days.length / 7) * 7;
  const grid = Array.from({ length: total }, (_, i) => addDays(first, i - lead));
  return Array.from({ length: total / 7 }, (_, w) => grid.slice(w * 7, w * 7 + 7));
}

/** Primeiro e último dia que cada visão mostra. */
export function rangeOf(view: AgendaView, date: string) {
  if (view === "dia") return { from: date, to: date };
  if (view === "semana") return { from: weekStart(date), to: addDays(weekStart(date), 6) };
  const weeks = monthWeeks(date.slice(0, 7));
  return { from: weeks[0][0], to: weeks.at(-1)![6] };
}

/** Data de destino das setas ‹ ›. */
export function shift(view: AgendaView, date: string, direction: 1 | -1) {
  if (view === "dia") return addDays(date, direction);
  if (view === "semana") return addDays(date, 7 * direction);
  return `${addMonths(date.slice(0, 7), direction)}-01`;
}

/** Semana do mês (1 a 6), como na Untitled UI. */
export function weekOfMonth(date: string) {
  const firstWeekday = weekdayOf(`${date.slice(0, 7)}-01`);
  return Math.ceil((Number(date.slice(8)) + firstWeekday) / 7);
}

const dateFmt = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", ...options });

export const formatDayMonth = (date: string) => dateFmt(date, { day: "numeric", month: "short" });
export const formatFullDate = (date: string) =>
  dateFmt(date, { day: "numeric", month: "short", year: "numeric" });
/** "dom." */
export const formatWeekdayShort = (date: string) => dateFmt(date, { weekday: "short" });

export function formatRange(view: AgendaView, date: string) {
  if (view === "dia") return null;
  if (view === "mes") {
    const month = date.slice(0, 7);
    const last = addDays(`${addMonths(month, 1)}-01`, -1);
    return `${formatFullDate(`${month}-01`)} – ${formatFullDate(last)}`;
  }
  const { from, to } = rangeOf("semana", date);
  return `${formatDayMonth(from)} – ${formatFullDate(to)}`;
}

export function formatTitle(date: string) {
  return formatMonth(date.slice(0, 7));
}

export const HOUR_HEIGHT = 72;

/** Faixa de horas da grade, em minutos do dia. */
export type Grid = { start: number; end: number; hours: number[] };

/** Uma hora antes de abrir até duas depois do último início (cobre o atendimento mais longo). */
export function gridOf(settings: ScheduleSettings): Grid {
  const start = Math.max(0, Math.floor(toMinutes(settings.openTime) / 60) * 60 - 60);
  const end = Math.min(24 * 60, Math.ceil((toMinutes(settings.lastStartTime) + 120) / 60) * 60);
  return { start, end, hours: Array.from({ length: (end - start) / 60 }, (_, i) => start + i * 60) };
}

export function minutesToPx(minutes: number, grid: Pick<Grid, "start">) {
  return ((minutes - grid.start) / 60) * HOUR_HEIGHT;
}

export type PlacedReservation = {
  reservation: AgendaReservation;
  top: number;
  height: number;
  /** Coluna e total de colunas, para reservas no mesmo horário ficarem lado a lado. */
  lane: number;
  lanes: number;
};

export function placeDay(reservations: AgendaReservation[], grid: Grid): PlacedReservation[] {
  const items = reservations
    .map((r) => ({ r, start: toMinutes(r.time), end: toMinutes(r.time) + r.service.durationMinutes }))
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const placed: PlacedReservation[] = [];
  // Reservas que se encostam formam um grupo e dividem a largura da coluna.
  let group: { item: PlacedReservation; end: number }[] = [];
  let groupEnd = -1;
  const closeGroup = () => {
    const lanes = Math.max(...group.map((g) => g.item.lane)) + 1;
    for (const { item } of group) placed.push({ ...item, lanes });
    group = [];
  };

  for (const { r, start, end } of items) {
    if (group.length > 0 && start >= groupEnd) closeGroup();
    // Primeira coluna livre neste horário.
    let lane = 0;
    while (group.some((g) => g.item.lane === lane && g.end > start)) lane++;
    const top = minutesToPx(Math.max(start, grid.start), grid);
    const bottom = minutesToPx(Math.min(end, grid.end), grid);
    group.push({ item: { reservation: r, top, height: Math.max(bottom - top, 24), lane, lanes: 1 }, end });
    groupEnd = Math.max(groupEnd, end);
  }
  if (group.length > 0) closeGroup();
  return placed;
}

// Cor por profissional, no estilo dos eventos da Untitled UI.
const palette: Record<ProfessionalColor | "neutral", { event: string; dot: string }> = {
  blue: { event: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100", dot: "bg-blue-500" },
  violet: { event: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100", dot: "bg-violet-500" },
  emerald: { event: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100", dot: "bg-emerald-500" },
  amber: { event: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100", dot: "bg-amber-500" },
  rose: { event: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100", dot: "bg-rose-500" },
  cyan: { event: "border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100", dot: "bg-cyan-500" },
  neutral: { event: "border-black/15 bg-neutral-50 text-neutral-700 hover:bg-neutral-100", dot: "bg-neutral-500" },
};

/** Falta fica riscada e apagada, qualquer que seja o profissional. */
const missedTone = "line-through opacity-60";

export function legendOf(professionals: Professional[]) {
  return [
    ...professionals.map((p) => ({ label: p.name, dot: palette[p.color].dot })),
    { label: "Estúdio", dot: palette.neutral.dot },
  ];
}

export function toneOf(reservation: AgendaReservation, professionals: Professional[]) {
  const color = professionals.find((p) => p.name === reservation.service.professional)?.color ?? "neutral";
  const tone = palette[color];
  return reservation.attendance === "faltou" ? { ...tone, event: `${tone.event} ${missedTone}` } : tone;
}

export function colorDot(color: ProfessionalColor) {
  return palette[color].dot;
}

/** Horários de início da grade do funcionamento (sugestões para marcar e remarcar). */
export function scheduleTimes(settings: ScheduleSettings) {
  const times: string[] = [];
  for (let m = toMinutes(settings.openTime); m <= toMinutes(settings.lastStartTime); m += settings.stepMinutes) {
    times.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return times;
}
