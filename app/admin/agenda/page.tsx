import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "@/app/_components/icons";
import { PanelHeader } from "@/app/_components/panel-header";
import { PageTitle } from "@/app/_components/ui";
import { closuresFor } from "@/app/_lib/access";
import { requireMenu } from "@/app/_lib/auth";
import { agendaHref, legendOf, parseDate, parseView, rangeOf, scheduleTimes, weekDays } from "@/app/_lib/agenda";
import { getCatalog } from "@/app/_lib/catalog";
import { formatLongDate, formatWeekday, nowInStudio } from "@/app/_lib/availability";
import { getAgenda } from "@/app/_lib/reservations";
import { getAvailabilityRules } from "@/app/_lib/schedule";
import { cn } from "@/lib/utils";
import { AgendaHeader } from "./agenda-header";
import { DayPanel, Details } from "./day-panel";
import { MobileDefaultView } from "./mobile-view";
import { MonthView } from "./month-view";
import { ReservationSheet } from "./reservation-sheet";
import { TimeGrid } from "./time-grid";

export const metadata: Metadata = {
  title: "Agenda | Studio Heitor Macks",
};

function Legend({ items, className }: { items: { label: string; dot: string }[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-[#5c5c5a] lg:text-[13px]", className)}>
      {items.map((l) => (
        <li key={l.label} className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", l.dot)} />
          {l.label}
        </li>
      ))}
    </ul>
  );
}

export default async function AgendaPage(props: PageProps<"/admin/agenda">) {
  const { visao, data, reserva } = await props.searchParams;
  const { scope } = await requireMenu("agenda", "/admin/agenda");

  const now = nowInStudio();
  const view = parseView(visao);
  const date = parseDate(data, now.date);
  const range = rangeOf(view, date);
  // Na visão de dia o minicalendário marca os dias com reserva no mês todo.
  const fetchRange = view === "dia" ? rangeOf("mes", date) : range;
  const reservations = await getAgenda(fetchRange.from, fetchRange.to, { scope });
  const selected = reservations.find((r) => r.id === reserva) ?? null;
  // Barbeiro não vê os dias fechados (nem os motivos) dos colegas.
  const allRules = await getAvailabilityRules();
  const rules = { ...allRules, closures: closuresFor(allRules.closures, scope) };
  // Barbeiro vê só a própria coluna e a própria legenda.
  const professionals = (await getCatalog()).professionals.filter((p) => scope.all || p.name === scope.professional);
  const legend = legendOf(professionals);
  const inRange = reservations.filter((r) => r.date >= range.from && r.date <= range.to);
  const dayReservations = reservations.filter((r) => r.date === date);
  const times = scheduleTimes(rules.settings);
  const title = scope.all ? "Agenda" : "Minha agenda";

  return (
    <>
      {!visao && <MobileDefaultView date={date} />}
      <div className="max-lg:hidden">
        <PanelHeader actions={<Legend items={legend} className="mr-2" />}>
          <PageTitle title={title} description={scope.all ? "Reservas de todos os clientes." : `Reservas com ${scope.professional}.`} />
        </PanelHeader>
      </div>

      <div className="-mx-4 -mt-5 flex flex-1 flex-col lg:m-0 lg:mt-6 lg:min-h-0 lg:overflow-hidden lg:rounded-[20px] lg:border lg:border-[#e7e5e4] lg:bg-white">
        <AgendaHeader
          view={view}
          date={date}
          today={now.date}
          count={inRange.length}
          who={scope.all ? "Todos os profissionais" : scope.professional!}
          busyDays={new Set(reservations.map((r) => r.date))}
        />

        {/* Celular, visão de dia: título do dia e legenda acima da grade. */}
        {view === "dia" && (
          <div className="flex flex-col gap-3 px-4 pt-4 pb-3 lg:hidden">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[17px] font-bold first-letter:uppercase">
                {formatWeekday(date).split("-")[0]}, {formatLongDate(date).replace(/ de \d{4}$/, "")}
              </h2>
              <span className="shrink-0 text-[13px] font-semibold text-[#5c5c5a]">
                {dayReservations.length} {dayReservations.length === 1 ? "reserva" : "reservas"}
              </span>
            </div>
            <Legend items={legend} />
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col max-lg:mx-4 max-lg:overflow-hidden max-lg:rounded-[18px] max-lg:border max-lg:border-[#e7e5e4] max-lg:bg-white">
          {view === "mes" && (
            <MonthView date={date} today={now.date} reservations={reservations} rules={rules} professionals={professionals} />
          )}

          {view === "semana" && (
            <TimeGrid days={weekDays(date)} today={now.date} reservations={reservations} rules={rules} professionals={professionals} />
          )}

          {view === "dia" && (
            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <TimeGrid
                days={[date]}
                today={now.date}
                reservations={dayReservations}
                selectedId={selected?.id}
                rules={rules}
                professionals={professionals}
              />
              <DayPanel
                date={date}
                today={now.date}
                reservations={reservations}
                selected={selected?.date === date ? selected : null}
                now={now}
                times={times}
                professionals={professionals}
                admin={scope.all}
                chatAllowed
              />
            </div>
          )}
        </div>
      </div>

      {/* Celular: reserva aberta numa folha de baixo. */}
      {selected && (
        <ReservationSheet key={selected.id} closeHref={agendaHref("dia", selected.date)} title={`Reserva de ${selected.customer.name}`}>
          <Details reservation={selected} now={now} times={times} chat professionals={professionals} inSheet />
        </ReservationSheet>
      )}

      {/* Celular: ação principal flutuante acima da tab bar. */}
      <Link
        href={`/admin/agenda/nova?data=${date < now.date ? now.date : date}`}
        className="fixed right-4 bottom-[calc(65px+env(safe-area-inset-bottom)+16px)] z-30 flex h-14 items-center gap-2 rounded-[18px] bg-[#121212] pr-[22px] pl-[18px] text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] lg:hidden"
      >
        <PlusIcon className="size-5" />
        Nova reserva
      </Link>
    </>
  );
}
