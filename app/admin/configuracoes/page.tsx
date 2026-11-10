import type { Metadata } from "next";
import Link from "next/link";
import { PanelHeader } from "@/app/_components/panel-header";
import { agendaHref } from "@/app/_lib/agenda";
import { requireAdmin } from "@/app/_lib/auth";
import { addDays, formatShortMonth, formatWeekday, nowInStudio } from "@/app/_lib/availability";
import type { Closure } from "@/app/_lib/db";
import { getAgenda, isPast, type AgendaReservation } from "@/app/_lib/reservations";
import { getAvailabilityRules } from "@/app/_lib/schedule";
import { ConfirmButton } from "@/app/_components/confirm-button";
import { card as cardBase, dangerLink, linkButton, PageTitle, scrollArea } from "@/app/_components/ui";
import { getCatalog } from "@/app/_lib/catalog";
import { shortDate as formatShortDate } from "@/app/_lib/format";
import { deleteClosure } from "@/app/_lib/settings-actions";
import { getStudio } from "@/app/_lib/studio";
import { cn } from "@/lib/utils";
import { ClosureForm } from "./closure-form";
import { ScheduleForm } from "./schedule-form";
import { StudioForm } from "./studio-form";

export const metadata: Metadata = {
  title: "Configurações | Studio Heitor Macks",
};

const card = `${cardBase} p-5`;
const shortDate = (date: string) => formatShortDate(date, { year: false });

function formatPeriod(c: Closure) {
  if (c.start === c.end) return `${formatWeekday(c.start)}, ${shortDate(c.start)} de ${c.start.slice(0, 4)}`;
  return `${shortDate(c.start)} a ${shortDate(c.end)} de ${c.end.slice(0, 4)}`;
}

function daysIn(c: Closure) {
  let n = 1;
  for (let d = c.start; d < c.end; d = addDays(d, 1)) n++;
  return n;
}

function ClosureItem({
  closure: c,
  today,
  conflicts,
}: {
  closure: Closure;
  today: string;
  conflicts: AgendaReservation[];
}) {
  const ongoing = c.start <= today && today <= c.end;
  const days = daysIn(c);
  return (
    <li className="flex flex-col gap-3 border-t border-black/10 py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start gap-4">
        <div className="grid w-14 shrink-0 overflow-hidden rounded-lg border border-black/15 bg-white text-center">
          <span className="bg-black/5 py-0.5 text-[11px] font-semibold text-black/60">{formatShortMonth(c.start)}</span>
          <span className="py-1 text-xl font-bold text-black">{Number(c.start.slice(8))}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-black">{c.reason}</p>
            {ongoing && (
              <span className="rounded-full bg-[#121212] px-2.5 py-0.5 text-xs font-semibold text-white">
                Em andamento
              </span>
            )}
          </div>
          <p className="text-sm text-black/70">
            {formatPeriod(c)} · {days} {days === 1 ? "dia" : "dias"}
          </p>
          <p className="text-sm text-black/70">{c.professional ? `Só ${c.professional} não atende` : "Estúdio todo fechado"}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href={agendaHref("semana", c.start)} className={linkButton}>
            Ver na agenda
          </Link>
          <ConfirmButton
            action={deleteClosure}
            fields={{ id: c.id }}
            title={`Reabrir “${c.reason}”?`}
            description={`${formatPeriod(c)} volta a aceitar agendamentos${c.professional ? ` com ${c.professional}` : ""}.`}
            confirmLabel="Reabrir período"
            successMessage="Período reaberto."
            tone="neutral"
            className={dangerLink}
          >
            Reabrir
          </ConfirmButton>
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">
            {conflicts.length} {conflicts.length === 1 ? "reserva já marcada" : "reservas já marcadas"} nesse período.
            Elas não foram canceladas: abra cada uma para remarcar ou cancelar (com aviso ao cliente).
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {conflicts.slice(0, 6).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3">
                <span>
                  {shortDate(r.date)} às {r.time} · {r.customer.name} · {r.service.name}
                </span>
                <Link href={agendaHref("dia", r.date, r.id)} className="font-semibold underline underline-offset-4">
                  Abrir reserva
                </Link>
              </li>
            ))}
          </ul>
          {conflicts.length > 6 && <p className="mt-1">e mais {conflicts.length - 6}.</p>}
        </div>
      )}
    </li>
  );
}

export default async function ConfiguracoesPage() {
  await requireAdmin("/admin/configuracoes");
  const now = nowInStudio();
  const rules = await getAvailabilityRules();
  const { professionals } = await getCatalog();
  const studio = await getStudio();
  const reservations = (await getAgenda(now.date)).filter((r) => !isPast(r, now));

  const active = rules.closures.filter((c) => c.end >= now.date).sort((a, b) => a.start.localeCompare(b.start));
  const finished = rules.closures.filter((c) => c.end < now.date).sort((a, b) => b.start.localeCompare(a.start));
  const conflictsOf = (c: Closure) =>
    reservations.filter(
      (r) =>
        c.start <= r.date && r.date <= c.end && (!c.professional || r.service.professional === c.professional),
    );

  return (
    <>
      <PanelHeader>
        <PageTitle title="Configurações" description="Dias fechados, funcionamento da agenda e dados do estúdio." />
      </PanelHeader>

      <div className={cn("mt-7 flex flex-col gap-5", scrollArea)}>
        <section className={card}>
          <h2 className="text-lg font-bold text-black">Fechar dias da agenda</h2>
          <p className="mt-1 mb-4 text-sm text-black/70">
            Férias, feriados ou folgas. Nos dias fechados nenhum horário aparece para os clientes, e o sistema
            recusa qualquer reserva nesse período.
          </p>
          <ClosureForm today={now.date} professionals={professionals.map((p) => p.name)} />
        </section>

        <section className={card}>
          <h2 className="text-lg font-bold text-black">Períodos fechados</h2>
          {active.length === 0 ? (
            <p className="mt-2 text-sm text-black/60">Nenhum período fechado daqui para frente.</p>
          ) : (
            <ul className="mt-4">
              {active.map((c) => (
                <ClosureItem key={c.id} closure={c} today={now.date} conflicts={conflictsOf(c)} />
              ))}
            </ul>
          )}
          {finished.length > 0 && (
            <details className="mt-4 border-t border-black/10 pt-3">
              <summary className="cursor-pointer text-sm font-semibold text-black/70 hover:text-black">
                Encerrados ({finished.length})
              </summary>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-black/60">
                {finished.map((c) => (
                  <li key={c.id}>
                    {c.reason} · {formatPeriod(c)}
                    {c.professional && ` · só ${c.professional}`}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className={card}>
          <h2 className="text-lg font-bold text-black">Funcionamento</h2>
          <p className="mt-1 mb-4 text-sm text-black/70">Dias e horários em que os clientes podem marcar.</p>
          <ScheduleForm settings={rules.settings} />
        </section>

        <section className={cn(card, "mb-1")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-lg font-bold text-black">Dados do estúdio</h2>
            <Link href="/admin/marketing/templates?canal=email" className={linkButton}>
              Ver e-mails do sistema
            </Link>
          </div>
          <p className="mt-1 mb-4 text-sm text-black/70">Aparecem no menu lateral e nos e-mails enviados aos clientes.</p>
          <StudioForm studio={studio} />
        </section>
      </div>
    </>
  );
}
