import type { Metadata } from "next";
import Link from "next/link";
import { PanelHeader } from "@/app/_components/panel-header";
import { card, linkButton, PageTitle, scrollArea, Stat } from "@/app/_components/ui";
import { agendaHref, scheduleTimes, weekStart } from "@/app/_lib/agenda";
import { requireAdmin } from "@/app/_lib/auth";
import { addDays, formatLongDate, formatWeekday, nowInStudio } from "@/app/_lib/availability";
import { getCatalog } from "@/app/_lib/catalog";
import { readDb } from "@/app/_lib/db";
import { shortDate } from "@/app/_lib/format";
import { getAgenda, isDone, statusOf } from "@/app/_lib/reservations";
import { getAvailabilityRules } from "@/app/_lib/schedule";
import { formatPrice } from "@/app/_lib/services";
import { cn } from "@/lib/utils";
import { AgendaHeader } from "./agenda/agenda-header";
import { DayPanel } from "./agenda/day-panel";
import { TimeGrid } from "./agenda/time-grid";

export const metadata: Metadata = {
  title: "Início | Studio Heitor Macks",
};

function greeting(minutes: number) {
  if (minutes < 12 * 60) return "Bom dia";
  if (minutes < 18 * 60) return "Boa tarde";
  return "Boa noite";
}

// Início do admin: a agenda do dia em destaque, no visual da Agenda. As
// mensagens, as falhas de envio e os outros avisos chegam pelo sino.
export default async function AdminHomePage() {
  const admin = await requireAdmin("/admin");
  const now = nowInStudio();
  const monday = weekStart(now.date);
  const [agenda, catalog, db, rules] = await Promise.all([
    getAgenda(monday, addDays(now.date, 7)),
    getCatalog(),
    readDb(),
    getAvailabilityRules(),
  ]);

  const today = agenda.filter((r) => r.date === now.date);
  const remaining = today.filter((r) => statusOf(r, now) === "agendado");
  const weekDone = agenda.filter((r) => r.date <= now.date && isDone(r, now));
  const weekRevenue = weekDone.reduce((sum, r) => sum + r.service.priceCents, 0);
  // Fechamentos que começam nas próximas duas semanas ou estão em andamento.
  const closures = db.closures
    .filter((c) => c.end >= now.date && c.start <= addDays(now.date, 14))
    .sort((a, b) => a.start.localeCompare(b.start));
  // Horários passados de hoje e da semana ainda sem marcação de comparecimento.
  const toConfirm = agenda.filter((r) => r.date <= now.date && statusOf(r, now) !== "agendado" && !r.attendance);
  const nextDays = Array.from({ length: 6 }, (_, i) => addDays(now.date, i + 1)).map((date) => ({
    date,
    count: agenda.filter((r) => r.date === date).length,
  }));

  return (
    <>
      <PanelHeader>
        <PageTitle
          title={`${greeting(now.minutes)}, ${admin.name.split(" ")[0]}`}
          description={`${formatWeekday(now.date)}, ${formatLongDate(now.date)}`}
        />
      </PanelHeader>

      <div className={cn("mt-7 flex flex-col gap-5", scrollArea)}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stat
            label="HOJE"
            value={`${today.length} ${today.length === 1 ? "horário" : "horários"}`}
            hint={today.length ? `${remaining.length} ainda por vir` : "Agenda livre"}
            href={agendaHref("dia", now.date)}
          />
          <Stat
            label="FATURADO NA SEMANA"
            value={formatPrice(weekRevenue)}
            hint={`${weekDone.length} ${weekDone.length === 1 ? "atendimento" : "atendimentos"} desde domingo`}
            href={`/admin/historico?de=${monday}&ate=${now.date}&situacao=realizados`}
          />
        </div>

        {/* Agenda de hoje: o mesmo cabeçalho, grade e lista da Agenda (visão Dia). */}
        <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-xl border border-black/10 bg-white/85 lg:min-h-[560px]">
          <AgendaHeader view="dia" date={now.date} today={now.date} views={false} />
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <TimeGrid
              days={[now.date]}
              today={now.date}
              reservations={today}
              rules={rules}
              professionals={catalog.professionals}
            />
            <DayPanel
              date={now.date}
              today={now.date}
              reservations={agenda}
              selected={null}
              now={now}
              times={scheduleTimes(rules.settings)}
              professionals={catalog.professionals}
              admin
              calendar={false}
            />
          </div>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-2">
          <section className={cn(card, "p-5")}>
            <h2 className="text-lg font-bold text-black">Próximos dias</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {nextDays.map((d) => (
                <Link
                  key={d.date}
                  href={agendaHref("dia", d.date)}
                  className="rounded-lg border border-black/10 bg-white px-2 py-2 text-center transition hover:border-black/30"
                >
                  <span className="block text-xs text-black/60 capitalize">{formatWeekday(d.date).slice(0, 3)}</span>
                  <span className="block text-sm font-semibold text-black">{shortDate(d.date, { year: false })}</span>
                  <span className={cn("block text-xs", d.count ? "font-semibold text-black" : "text-black/40")}>
                    {d.count} {d.count === 1 ? "horário" : "horários"}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-5">
            {toConfirm.length > 0 && (
              <section className={cn(card, "border-amber-200 bg-amber-50/80 p-5")}>
                <h2 className="text-base font-bold text-amber-900">Confirme quem veio</h2>
                <p className="mt-1 text-sm text-amber-900/80">
                  {toConfirm.length} {toConfirm.length === 1 ? "atendimento desta semana está" : "atendimentos desta semana estão"} sem
                  marcação. Marque as faltas para o faturamento ficar certo.
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {toConfirm.slice(-4).map((r) => (
                    <li key={r.id}>
                      <Link href={agendaHref("dia", r.date, r.id)} className="text-amber-900 underline underline-offset-4">
                        {shortDate(r.date, { year: false })} {r.time} · {r.customer.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {closures.length > 0 && (
              <section className={cn(card, "p-5")}>
                <h2 className="text-lg font-bold text-black">Dias fechados chegando</h2>
                <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                  {closures.map((c) => (
                    <li key={c.id} className="text-black/70">
                      <span className="font-semibold text-black">{c.reason}</span> ·{" "}
                      {c.start === c.end
                        ? shortDate(c.start, { year: false })
                        : `${shortDate(c.start, { year: false })} a ${shortDate(c.end, { year: false })}`}
                      {c.professional && ` · só ${c.professional}`}
                    </li>
                  ))}
                </ul>
                <Link href="/admin/configuracoes" className={cn(linkButton, "mt-2 inline-block")}>
                  Gerenciar
                </Link>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
