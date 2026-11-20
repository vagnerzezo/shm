import type { Metadata } from "next";
import { PanelHeader } from "@/app/_components/panel-header";
import { closuresFor } from "@/app/_lib/access";
import { requireMenu } from "@/app/_lib/auth";
import { parseDate, parseView, rangeOf, scheduleTimes, weekDays } from "@/app/_lib/agenda";
import { getCatalog } from "@/app/_lib/catalog";
import { nowInStudio } from "@/app/_lib/availability";
import { getAgenda } from "@/app/_lib/reservations";
import { getAvailabilityRules } from "@/app/_lib/schedule";
import { AgendaHeader } from "./agenda-header";
import { DayPanel } from "./day-panel";
import { MobileDefaultView } from "./mobile-view";
import { MonthView } from "./month-view";
import { TimeGrid } from "./time-grid";

export const metadata: Metadata = {
  title: "Agenda | Studio Heitor Macks",
};

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

  return (
    <>
      {!visao && <MobileDefaultView date={date} />}
      <PanelHeader>
        <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">{scope.all ? "Agenda" : "Minha agenda"}</h1>
        <p className="mt-1 text-sm text-black/70">
          {scope.all ? "Reservas de todos os clientes." : `Reservas com ${scope.professional}.`}
        </p>
      </PanelHeader>

      <div className="mt-7 flex min-h-[80vh] flex-1 flex-col overflow-hidden rounded-xl border border-black/10 bg-white/85 lg:min-h-0">
        <AgendaHeader view={view} date={date} today={now.date} />

        {view === "mes" && <MonthView date={date} today={now.date} reservations={reservations} rules={rules} professionals={professionals} />}

        {view === "semana" && (
          <TimeGrid
            days={weekDays(date)}
            today={now.date}
            reservations={reservations}
            rules={rules}
            professionals={professionals}
          />
        )}

        {view === "dia" && (
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <TimeGrid
              days={[date]}
              today={now.date}
              reservations={reservations.filter((r) => r.date === date)}
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
              times={scheduleTimes(rules.settings)}
              professionals={professionals}
            />
          </div>
        )}
      </div>
    </>
  );
}
