import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon, PlusIcon } from "@/app/_components/icons";
import {
  agendaHref,
  formatRange,
  formatTitle,
  shift,
  views,
  weekOfMonth,
  type AgendaView,
} from "@/app/_lib/agenda";
import { formatShortMonth, formatWeekday } from "@/app/_lib/availability";
import { cn } from "@/lib/utils";

const navButton =
  "grid h-10 place-items-center px-3 text-sm font-semibold text-black transition hover:bg-black/5";

export function AgendaHeader({ view, date, today }: { view: AgendaView; date: string; today: string }) {
  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-black/10 px-4 py-4 sm:px-6">
      {/* Selo com a data de hoje, como na Untitled UI. */}
      <Link
        href={agendaHref(view, today)}
        aria-label="Ir para hoje"
        className="flex w-16 shrink-0 flex-col items-center overflow-hidden rounded-lg border border-black/15 bg-white text-center"
      >
        <span className="w-full bg-black/5 py-0.5 text-[11px] font-semibold tracking-wide text-black/60">
          {formatShortMonth(today)}
        </span>
        <span className="py-1 text-xl font-bold text-black">{Number(today.slice(8))}</span>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight text-black">{formatTitle(date)}</h2>
          <span className="rounded-md border border-black/15 px-2 py-0.5 text-xs font-semibold text-black/70">
            Semana {weekOfMonth(date)}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-black/60">{formatRange(view, date) ?? formatWeekday(date)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Navegar na agenda" className="flex overflow-hidden rounded-lg border border-black/15 bg-white">
          <Link href={agendaHref(view, shift(view, date, -1))} aria-label="Anterior" className={navButton}>
            <ArrowLeftIcon className="size-4" />
          </Link>
          <Link href={agendaHref(view, today)} className={cn(navButton, "border-x border-black/15")}>
            Hoje
          </Link>
          <Link href={agendaHref(view, shift(view, date, 1))} aria-label="Próximo" className={navButton}>
            <ArrowRightIcon className="size-4" />
          </Link>
        </nav>

        <nav aria-label="Visualização" className="flex gap-1 rounded-lg border border-black/15 bg-white p-1">
          {views.map((v) => (
            <Link
              key={v.id}
              href={agendaHref(v.id, date)}
              aria-current={v.id === view ? "page" : undefined}
              className={cn(
                "flex h-8 items-center rounded-md px-3 text-sm font-semibold transition",
                v.id === view ? "bg-[#121212] text-white" : "text-black hover:bg-black/5",
              )}
            >
              {v.label}
            </Link>
          ))}
        </nav>

        <Link
          href={`/admin/agenda/nova?data=${date < today ? today : date}`}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#121212] px-4 text-sm font-semibold text-white transition hover:bg-black/80"
        >
          <PlusIcon className="size-4" />
          Nova reserva
        </Link>
      </div>
    </header>
  );
}
