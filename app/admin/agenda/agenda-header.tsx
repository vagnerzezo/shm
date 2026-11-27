import Link from "next/link";
import { displayClass } from "@/app/_components/client/ui";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "@/app/_components/icons";
import {
  agendaHref,
  formatRange,
  formatTitle,
  shift,
  views,
  weekDays,
  weekOfMonth,
  type AgendaView,
} from "@/app/_lib/agenda";
import { formatLongDate, formatWeekday } from "@/app/_lib/availability";
import { cn } from "@/lib/utils";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function ViewSwitch({ view, date, className }: { view: AgendaView; date: string; className?: string }) {
  return (
    <nav aria-label="Visualização" className={cn("grid grid-cols-3 rounded-xl bg-[#f0efee] p-[3px] lg:flex lg:rounded-[10px]", className)}>
      {views.map((v) => (
        <Link
          key={v.id}
          href={agendaHref(v.id, date)}
          aria-current={v.id === view ? "page" : undefined}
          className={cn(
            "grid h-[34px] place-items-center rounded-[9px] px-4 text-sm font-semibold transition lg:rounded-lg",
            v.id === view ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]" : "text-[#5c5c5a] hover:text-[#121212]",
          )}
        >
          {v.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Cabeçalho da agenda. Celular: mês, "Hoje", Dia/Semana/Mês e a faixa da semana.
 * Computador: ‹ Hoje ›, intervalo, Dia/Semana/Mês e "Nova reserva".
 * `views: false` esconde Dia/Semana/Mês.
 */
export function AgendaHeader({
  view,
  date,
  today,
  count,
  who,
  busyDays,
  views: showViews = true,
}: {
  view: AgendaView;
  date: string;
  today: string;
  /** Reservas no período mostrado. */
  count: number;
  /** "Todos os profissionais" ou o nome do barbeiro. */
  who: string;
  /** Dias com reserva (bolinha na faixa da semana do celular). */
  busyDays: Set<string>;
  views?: boolean;
}) {
  const newHref = `/admin/agenda/nova?data=${date < today ? today : date}`;
  const navArrow = "grid size-10 place-items-center text-[#121212] transition hover:bg-[#f5f5f4]";

  return (
    <>
      {/* ---------- Celular ---------- */}
      <header className="flex flex-col gap-3 border-b border-[#e7e5e4] bg-white px-4 pt-3.5 pb-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className={cn(displayClass, "text-[30px] first-letter:uppercase")}>{formatTitle(date)}</h1>
            <p className="mt-0.5 text-xs font-semibold text-[#5c5c5a]">
              {who} · Semana {weekOfMonth(date)}
            </p>
          </div>
          <Link
            href={agendaHref(view, today)}
            className="flex h-9 shrink-0 items-center rounded-full border border-[#d6d3d1] px-3.5 text-sm font-semibold"
          >
            Hoje
          </Link>
        </div>

        {showViews && <ViewSwitch view={view} date={date} />}

        <div className="flex items-center gap-0.5">
          <Link href={agendaHref("dia", shift("semana", date, -1))} aria-label="Semana anterior" className="grid h-[52px] w-8 shrink-0 place-items-center text-[#5c5c5a]">
            <ChevronLeftIcon className="size-[18px]" />
          </Link>
          <div className="grid flex-1 grid-cols-7 gap-0.5">
            {weekDays(date).map((d) => {
              const selected = view === "dia" && d === date;
              const isToday = d === today;
              return (
                <Link
                  key={d}
                  href={agendaHref("dia", d)}
                  aria-current={selected ? "date" : undefined}
                  aria-label={`${formatWeekday(d)}, ${Number(d.slice(8))}${isToday ? " (hoje)" : ""}`}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-0.5 rounded-[14px]",
                    selected ? "bg-[#121212] text-white" : isToday && "shadow-[inset_0_0_0_1.5px_#121212]",
                  )}
                >
                  <span className={cn("text-[11px] font-semibold", selected ? "text-white/75" : isToday ? "font-bold" : "text-[#6b6b69]")}>
                    {formatWeekday(d).slice(0, 1)}
                  </span>
                  <span className={cn("text-base", selected || isToday ? "font-bold" : "font-semibold")}>{Number(d.slice(8))}</span>
                  <span className={cn("size-1 rounded-full", busyDays.has(d) ? (selected ? "bg-white" : "bg-[#121212]") : "bg-transparent")} />
                </Link>
              );
            })}
          </div>
          <Link href={agendaHref("dia", shift("semana", date, 1))} aria-label="Próxima semana" className="grid h-[52px] w-8 shrink-0 place-items-center text-[#5c5c5a]">
            <ChevronRightIcon className="size-[18px]" />
          </Link>
        </div>
      </header>

      {/* ---------- Computador ---------- */}
      <header className="flex items-center gap-4 border-b border-[#f0efee] px-[18px] py-3.5 max-lg:hidden">
        <nav aria-label="Navegar na agenda" className="flex shrink-0 overflow-hidden rounded-[10px] border border-[#e7e5e4]">
          <Link href={agendaHref(view, shift(view, date, -1))} aria-label="Anterior" className={navArrow}>
            <ChevronLeftIcon className="size-[18px]" />
          </Link>
          <Link
            href={agendaHref(view, today)}
            className="flex h-10 items-center border-x border-[#e7e5e4] px-3.5 text-sm font-semibold transition hover:bg-[#f5f5f4]"
          >
            Hoje
          </Link>
          <Link href={agendaHref(view, shift(view, date, 1))} aria-label="Próximo" className={navArrow}>
            <ChevronRightIcon className="size-[18px]" />
          </Link>
        </nav>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold first-letter:uppercase">
            {view === "dia" ? `${formatWeekday(date)}, ${formatLongDate(date)}` : (formatRange(view, date) ?? formatTitle(date))}
          </p>
          <p className="text-[13px] text-[#5c5c5a]">
            {view !== "mes" && `Semana ${weekOfMonth(date)} · `}
            {plural(count, "reserva", "reservas")}
          </p>
        </div>
        {showViews && <ViewSwitch view={view} date={date} />}
        <Link
          href={newHref}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[10px] bg-[#121212] px-4 text-sm font-semibold text-white transition hover:bg-black/85"
        >
          <PlusIcon className="size-[18px]" />
          Nova reserva
        </Link>
      </header>
    </>
  );
}
