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
import { settingsSection } from "@/app/_components/staff/nav";
import { card as cardBase, dangerLink, linkButton, PageTitle, secondaryButton } from "@/app/_components/ui";
import { getCatalog } from "@/app/_lib/catalog";
import { colorDot } from "@/app/_lib/agenda";
import { readDb } from "@/app/_lib/db";
import { shortDate as formatShortDate } from "@/app/_lib/format";
import { deleteClosure } from "@/app/_lib/settings-actions";
import { getTeam } from "@/app/_lib/domain/team";
import { getStudio } from "@/app/_lib/studio";
import { cn } from "@/lib/utils";
import { ClosureForm } from "./closure-form";
import { ProfessionalsCard } from "./professionals-card";
import { ScheduleForm } from "./schedule-form";
import { SectionNav } from "./section-nav";
import { StudioForm } from "./studio-form";
import { TeamCard } from "./team-card";

export const metadata: Metadata = {
  title: "Configurações | Studio Heitor Macks",
};

const card = cn(cardBase, "p-4 lg:rounded-[20px] lg:px-6 lg:py-[22px]");
const muted = "text-[#5c5c5a]";
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
    <li className="flex flex-col gap-3 border-t border-[#f0efee] py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start gap-4">
        <div className="grid w-14 shrink-0 overflow-hidden rounded-lg border border-[#e7e5e4] bg-white text-center">
          <span className="bg-[#f5f5f4] py-0.5 text-[11px] font-semibold text-[#5c5c5a]">{formatShortMonth(c.start)}</span>
          <span className="py-1 text-xl font-bold">{Number(c.start.slice(8))}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{c.reason}</p>
            {ongoing && (
              <span className="rounded-full bg-[#121212] px-2.5 py-0.5 text-xs font-semibold text-white">
                Em andamento
              </span>
            )}
          </div>
          <p className="text-sm text-[#5c5c5a]">
            {formatPeriod(c)} · {days} {days === 1 ? "dia" : "dias"}
          </p>
          <p className="text-sm text-[#5c5c5a]">{c.professional ? `Só ${c.professional} não atende` : "Estúdio todo fechado"}</p>
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

export default async function ConfiguracoesPage(props: PageProps<"/admin/configuracoes">) {
  const me = await requireAdmin("/admin/configuracoes");
  const { secao } = await props.searchParams;
  const section = settingsSection(typeof secao === "string" ? secao : undefined);

  return (
    <>
      <PanelHeader>
        <PageTitle title="Configurações" description="Agenda, profissionais, equipe e dados do estúdio." />
      </PanelHeader>

      <div className="mt-4 flex flex-col gap-4 lg:mt-6 lg:flex-row lg:items-start lg:gap-7">
        <SectionNav active={section} />
        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-5">
          {section === "agenda" && <AgendaSection />}
          {section === "profissionais" && <ProfessionalsSection meId={me.id} meProfessional={me.professional ?? null} />}
          {section === "equipe" && (
            <section className={card}>
              <h2 className="text-lg font-bold">Equipe e permissões</h2>
              <p className={cn("mt-1 mb-4 text-sm", muted)}>
                Quem é admin e quem é barbeiro. O acesso de barbeiro é criado em{" "}
                <Link href="/admin/configuracoes?secao=profissionais" className="font-semibold text-[#121212] underline underline-offset-4">
                  Profissionais
                </Link>
                .
              </p>
              <TeamCard team={await getTeam()} meId={me.id} />
            </section>
          )}
          {section === "estudio" && (
            <section className={card}>
              <h2 className="text-lg font-bold">Dados do estúdio</h2>
              <p className={cn("mt-1 mb-4 text-sm", muted)}>Aparecem no menu lateral e nos e-mails enviados aos clientes.</p>
              <StudioForm studio={await getStudio()} />
            </section>
          )}
          {section === "emails" && (
            <section className={card}>
              <h2 className="text-lg font-bold">E-mails do sistema</h2>
              <p className={cn("mt-1 text-sm", muted)}>
                Boas-vindas, agendamento realizado, cancelado, redefinição de senha e os outros enviados automaticamente.
                Os textos ficam em Marketing → Templates; logo, contato e redes vêm de Dados do estúdio.
              </p>
              <Link href="/admin/marketing/templates?canal=email" className={cn(secondaryButton, "mt-4")}>
                Abrir e-mails do sistema
              </Link>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

async function AgendaSection() {
  const now = nowInStudio();
  const rules = await getAvailabilityRules();
  const { professionals } = await getCatalog();
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
      <section className={card}>
        <h2 className="text-lg font-bold">Funcionamento</h2>
        <p className={cn("mt-1 mb-[18px] text-sm", muted)}>
          Dias e horários em que os clientes podem marcar. Mudanças valem para novos agendamentos.
        </p>
        <ScheduleForm settings={rules.settings} />
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold">Fechar dias da agenda</h2>
        <p className={cn("mt-1 mb-[18px] text-sm", muted)}>
          Férias, feriados ou folgas. Nos dias fechados nenhum horário aparece e o sistema recusa reservas.
        </p>
        <ClosureForm today={now.date} professionals={professionals.map((p) => p.name)} />

        {active.length === 0 ? (
          <p className={cn("mt-[18px] rounded-xl border border-dashed border-[#d6d3d1] bg-[#fafaf9] px-4 py-3.5 text-sm", muted)}>
            Nenhum período fechado daqui para frente.
          </p>
        ) : (
          <>
            <h3 className="mt-6 mb-3 text-[15px] font-bold">Períodos fechados</h3>
            <ul>
              {active.map((c) => (
                <ClosureItem key={c.id} closure={c} today={now.date} conflicts={conflictsOf(c)} />
              ))}
            </ul>
          </>
        )}
        {finished.length > 0 && (
          <details className="mt-4 border-t border-[#f0efee] pt-3">
            <summary className={cn("cursor-pointer text-sm font-semibold hover:text-[#121212]", muted)}>
              Encerrados ({finished.length})
            </summary>
            <ul className={cn("mt-2 flex flex-col gap-1 text-sm", muted)}>
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
    </>
  );
}

async function ProfessionalsSection({ meId, meProfessional }: { meId: string; meProfessional: string | null }) {
  const today = nowInStudio().date;
  const { professionals, services } = await getCatalog();
  const { reservations, users } = await readDb();
  return (
    <ProfessionalsCard
      professionals={professionals.map((p) => ({
        ...p,
        dot: colorDot(p.color),
        services: services.filter((s) => s.professional === p.name).length,
        // Atendimentos futuros atribuídos a ele (inclui serviços sem profissional fixo).
        upcoming: reservations.filter((r) => r.professional === p.name && !r.cancelledAt && r.date >= today).length,
        access: users
          .filter((u) => u.role === "barbeiro" && u.professional === p.name)
          .map((u) => ({ id: u.id, email: u.email })),
        isMe: meProfessional === p.name,
        otherAdmins: users.filter((u) => u.role === "admin" && u.id !== meId && u.professional === p.name).length,
      }))}
      linkedToMe={meProfessional}
    />
  );
}
