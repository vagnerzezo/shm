import type { Metadata } from "next";
import Link from "next/link";
import { CalendarIcon, PlusIcon, UsersIcon } from "@/app/_components/icons";
import { PanelHeader } from "@/app/_components/panel-header";
import { card, linkButton, PageTitle, primaryButton, secondaryButton } from "@/app/_components/ui";
import { agendaHref, weekStart } from "@/app/_lib/agenda";
import { requireAdmin } from "@/app/_lib/auth";
import { addDays, formatLongDate, formatWeekday, nowInStudio } from "@/app/_lib/availability";
import { endTime } from "@/app/_lib/booking";
import { getCatalog } from "@/app/_lib/catalog";
import { getConversations } from "@/app/_lib/chat";
import { formatListTime, initials } from "@/app/_lib/chat-format";
import { readDb } from "@/app/_lib/db";
import { shortDate } from "@/app/_lib/format";
import { getAgenda, isDone, professionalOf, statusOf, type AgendaReservation } from "@/app/_lib/reservations";
import { formatPrice, PROFESSIONAL_DOT, type Professional } from "@/app/_lib/services";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Início | Studio Heitor Macks",
};

function greeting(minutes: number) {
  if (minutes < 12 * 60) return "Bom dia";
  if (minutes < 18 * 60) return "Boa tarde";
  return "Boa noite";
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** "Sex" */
const wd = (date: string) => formatWeekday(date).slice(0, 3);

function Dot({ r, professionals }: { r: AgendaReservation; professionals: Professional[] }) {
  const name = professionalOf(r, r.service);
  const color = professionals.find((p) => p.name === name)?.color;
  return (
    <span
      aria-hidden="true"
      title={name ?? undefined}
      className={cn("size-2.5 shrink-0 rounded-full", color ? PROFESSIONAL_DOT[color] : "bg-[#78716c]")}
    />
  );
}

/** Dias seguintes com quantos horários cada um tem. */
function NextDays({ days, className }: { days: { date: string; count: number }[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {days.map((d) => (
        <Link
          key={d.date}
          href={agendaHref("dia", d.date)}
          className={cn(
            "flex flex-col rounded-[14px] px-3 py-2.5 transition lg:rounded-xl",
            d.count ? "bg-[#121212] text-white" : "border border-[#e7e5e4] bg-white hover:border-[#121212]",
          )}
        >
          <span className={cn("text-xs", d.count ? "text-white/70" : "text-[#5c5c5a]")}>
            {wd(d.date)} · {Number(d.date.slice(8))}
          </span>
          <span className={cn("text-[15px]", d.count ? "font-bold" : "font-semibold text-[#6b6b69]")}>
            {d.count ? plural(d.count, "horário", "horários") : "Livre"}
          </span>
        </Link>
      ))}
    </div>
  );
}

// Início do admin: números do dia e da semana, agenda de hoje, próximo
// atendimento e conversas recentes. Os outros avisos chegam pelo sino.
export default async function AdminHomePage() {
  const admin = await requireAdmin("/admin");
  const now = nowInStudio();
  const monday = weekStart(now.date);
  const [agenda, catalog, db, conversations] = await Promise.all([
    getAgenda(monday, addDays(now.date, 7)),
    getCatalog(),
    readDb(),
    getConversations(),
  ]);
  const { professionals } = catalog;

  const today = agenda.filter((r) => r.date === now.date);
  const remaining = today.filter((r) => statusOf(r, now) === "agendado");
  const weekDone = agenda.filter((r) => r.date <= now.date && isDone(r, now));
  const weekRevenue = weekDone.reduce((sum, r) => sum + r.service.priceCents, 0);
  const next = agenda.find((r) => r.date >= now.date && statusOf(r, now) === "agendado");
  const nextDays = Array.from({ length: 6 }, (_, i) => addDays(now.date, i + 1)).map((date) => ({
    date,
    count: agenda.filter((r) => r.date === date).length,
  }));
  const nextDaysTotal = nextDays.reduce((sum, d) => sum + d.count, 0);
  const recent = conversations.filter((c) => c.lastMessage).slice(0, 3);
  // Fechamentos que começam nas próximas duas semanas ou estão em andamento.
  const closures = db.closures
    .filter((c) => c.end >= now.date && c.start <= addDays(now.date, 14))
    .sort((a, b) => a.start.localeCompare(b.start));

  const todayLabel = today.length ? plural(today.length, "horário", "horários") : "0 horários";
  const todayHint = today.length ? `${remaining.length} ainda por vir` : "Agenda livre";
  const weekHint = `${plural(weekDone.length, "atendimento", "atendimentos")} desde domingo`;

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <PanelHeader
        actions={
          <Link href="/admin/agenda/nova" className={cn(primaryButton, "max-lg:hidden")}>
            <PlusIcon className="size-[18px]" />
            Nova reserva
          </Link>
        }
      >
        <p className="text-[13px] font-semibold text-[#5c5c5a] lg:text-sm">
          {formatWeekday(now.date)}, {formatLongDate(now.date)}
        </p>
        <PageTitle title={`${greeting(now.minutes)}, ${admin.name.split(" ")[0]}`} />
      </PanelHeader>

      {/* ---------- Celular ---------- */}
      <section aria-label="Resumo" className="grid grid-cols-2 overflow-hidden rounded-[20px] bg-[#121212] text-white lg:hidden">
        <Link href={agendaHref("dia", now.date)} className="flex flex-col gap-0.5 px-[18px] py-4">
          <span className="text-xs font-semibold text-white/70">Hoje</span>
          <span className="text-[26px] font-bold tracking-tight">{todayLabel}</span>
          <span className="text-xs text-white/70">{todayHint}</span>
        </Link>
        <Link
          href={`/admin/historico?de=${monday}&ate=${now.date}&situacao=realizados`}
          className="flex flex-col gap-0.5 border-l border-white/14 px-[18px] py-4"
        >
          <span className="text-xs font-semibold text-white/70">Faturado na semana</span>
          <span className="text-[26px] font-bold tracking-tight">{formatPrice(weekRevenue)}</span>
          <span className="text-xs text-white/70">{weekHint}</span>
        </Link>
      </section>

      <div className="grid grid-cols-2 gap-2.5 lg:hidden">
        <Link href="/admin/agenda/nova" className={cn(secondaryButton, "h-12 rounded-[14px] text-[15px]")}>
          <PlusIcon className="size-[18px]" />
          Nova reserva
        </Link>
        <Link href="/admin/clientes/novo" className={cn(secondaryButton, "h-12 rounded-[14px] text-[15px]")}>
          <UsersIcon className="size-[18px]" />
          Novo cliente
        </Link>
      </div>

      <section className="flex flex-col gap-2.5 lg:hidden">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-bold">Próximo horário</h2>
          <Link href="/admin/agenda" className="py-2 text-sm font-semibold text-[#5c5c5a]">
            Ver agenda
          </Link>
        </div>
        {next ? (
          <Link href={agendaHref("dia", next.date, next.id)} className={cn(card, "flex items-center gap-3.5 px-4 py-3.5")}>
            <span className="w-[52px] shrink-0 rounded-xl bg-[#f5f5f4] py-1.5 text-center">
              <span className="block text-[11px] font-bold text-[#5c5c5a] uppercase">{wd(next.date)}</span>
              <span className="block text-xl leading-tight font-bold">{Number(next.date.slice(8))}</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] font-semibold">{next.customer.name}</span>
              <span className="truncate text-[13px] text-[#5c5c5a]">
                {next.time} – {endTime(next.time, next.service.durationMinutes)} · {next.service.name}
              </span>
            </span>
            <Dot r={next} professionals={professionals} />
          </Link>
        ) : (
          <p className={cn(card, "px-4 py-5 text-center text-sm text-[#5c5c5a]")}>Nenhum horário marcado nos próximos dias.</p>
        )}
      </section>

      <section className="flex flex-col gap-2.5 lg:hidden">
        <h2 className="text-[17px] font-bold">Próximos dias</h2>
        <NextDays days={nextDays} />
      </section>

      {/* ---------- Computador ---------- */}
      <section aria-label="Resumo" className={cn(card, "grid grid-cols-4 rounded-[20px] max-lg:hidden")}>
        {[
          { label: "Hoje", value: todayLabel, hint: todayHint, href: agendaHref("dia", now.date) },
          {
            label: "Faturado na semana",
            value: formatPrice(weekRevenue),
            hint: weekHint,
            href: `/admin/historico?de=${monday}&ate=${now.date}&situacao=realizados`,
          },
          {
            label: "Próximo horário",
            value: next ? `${wd(next.date)} · ${next.time}` : "—",
            hint: next ? next.customer.name : "Nenhum marcado",
            href: next ? agendaHref("dia", next.date, next.id) : "/admin/agenda",
          },
          {
            label: "Próximos 6 dias",
            value: plural(nextDaysTotal, "horário", "horários"),
            hint: `${shortDate(nextDays[0].date, { year: false })} a ${shortDate(nextDays[5].date, { year: false })}`,
            href: agendaHref("semana", nextDays[0].date),
          },
        ].map((s, i) => (
          <Link key={s.label} href={s.href} className={cn("min-w-0 px-[22px] py-[18px]", i > 0 && "border-l border-[#f0efee]")}>
            <span className="block text-[13px] font-semibold text-[#5c5c5a]">{s.label}</span>
            <span className="mt-1 block truncate text-[28px] font-bold tracking-tight">{s.value}</span>
            <span className="block truncate text-[13px] text-[#5c5c5a]">{s.hint}</span>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-5 max-lg:hidden">
        <section className={cn(card, "flex flex-col overflow-hidden rounded-[20px]")}>
          <div className="flex items-center justify-between border-b border-[#f0efee] px-[22px] py-[18px]">
            <h2 className="text-[17px] font-bold">Agenda de hoje</h2>
            <Link href={agendaHref("dia", now.date)} className="text-sm font-semibold text-[#5c5c5a] hover:text-[#121212]">
              Abrir agenda
            </Link>
          </div>
          {today.length ? (
            <ul className="flex-1">
              {today.map((r) => (
                <li key={r.id} className="border-b border-[#f0efee] last:border-0">
                  <Link
                    href={agendaHref("dia", r.date, r.id)}
                    className={cn(
                      "flex items-center gap-4 px-[22px] py-3.5 text-sm transition hover:bg-[#fafaf9]",
                      statusOf(r, now) !== "agendado" && "text-[#6b6b69]",
                    )}
                  >
                    <span className="w-[110px] shrink-0 font-bold">
                      {r.time} – {endTime(r.time, r.service.durationMinutes)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{r.customer.name}</span>
                    <span className="min-w-0 flex-1 truncate text-[#5c5c5a]">{r.service.name}</span>
                    <Dot r={r} professionals={professionals} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2.5 p-6 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-[#f5f5f4]">
                <CalendarIcon className="size-[26px] text-[#5c5c5a]" />
              </span>
              <p className="mt-1.5 text-lg font-bold">Agenda livre hoje</p>
              <p className="text-sm text-[#5c5c5a]">
                Nenhum horário marcado para {formatWeekday(now.date).toLowerCase()}, {Number(now.date.slice(8))}.
              </p>
              <div className="mt-2 flex gap-2.5">
                <Link href={agendaHref("dia", addDays(now.date, 1))} className={cn(secondaryButton, "h-10 rounded-[10px]")}>
                  Ver amanhã
                </Link>
                <Link href="/admin/agenda/nova" className={cn(primaryButton, "h-10 rounded-[10px]")}>
                  Marcar horário
                </Link>
              </div>
            </div>
          )}
          <div className="border-t border-[#f0efee] px-[22px] pt-4 pb-5">
            <p className="mb-2.5 text-[13px] font-semibold text-[#5c5c5a]">Próximos dias</p>
            <NextDays days={nextDays} className="grid-cols-6" />
          </div>
        </section>

        <div className="flex min-h-0 flex-col gap-5">
          <section className={cn(card, "rounded-[20px] px-[22px] py-[18px]")}>
            <h2 className="mb-3.5 text-[17px] font-bold">Próximo atendimento</h2>
            {next ? (
              <Link href={agendaHref("dia", next.date, next.id)} className="flex items-center gap-3.5">
                <span className="w-14 shrink-0 rounded-xl bg-[#f5f5f4] py-2 text-center">
                  <span className="block text-[11px] font-bold text-[#5c5c5a] uppercase">{wd(next.date)}</span>
                  <span className="block text-[22px] leading-tight font-bold">{Number(next.date.slice(8))}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">{next.customer.name}</span>
                  <span className="block truncate text-sm text-[#5c5c5a]">
                    {next.time} – {endTime(next.time, next.service.durationMinutes)} · {next.service.name}
                  </span>
                  <span className="flex items-center gap-1.5 text-[13px] text-[#5c5c5a]">
                    <Dot r={next} professionals={professionals} />
                    {professionalOf(next, next.service) ?? "Sem profissional fixo"} · {formatPrice(next.service.priceCents)}
                  </span>
                </span>
              </Link>
            ) : (
              <p className="text-sm text-[#5c5c5a]">Nenhum horário marcado nos próximos dias.</p>
            )}
          </section>

          <section className={cn(card, "flex-1 overflow-hidden rounded-[20px] pb-2")}>
            <div className="flex items-center justify-between px-[22px] pt-[18px] pb-2.5">
              <h2 className="text-[17px] font-bold">Conversas recentes</h2>
              <Link href="/admin/chat" className="text-sm font-semibold text-[#5c5c5a] hover:text-[#121212]">
                Abrir chat
              </Link>
            </div>
            {recent.length === 0 && <p className="px-[22px] pb-3 text-sm text-[#5c5c5a]">Nenhuma conversa ainda.</p>}
            {recent.map((c) => (
              <Link
                key={c.customer.id}
                href={`/admin/chat?cliente=${c.customer.id}`}
                className="flex items-center gap-3 px-[22px] py-2.5 transition hover:bg-[#fafaf9]"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f0efee] text-[13px] font-bold">
                  {initials(c.customer.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{c.customer.name}</span>
                    <span className="shrink-0 text-xs text-[#6b6b69]">{formatListTime(c.lastMessage!.createdAt)}</span>
                  </span>
                  <span className={cn("block truncate text-[13px]", c.unread ? "font-semibold text-[#121212]" : "text-[#5c5c5a]")}>
                    {c.lastMessage!.from === "cliente" ? "" : "Você: "}
                    {c.lastMessage!.text}
                  </span>
                </span>
                {c.unread > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#dc2626] px-1.5 text-[11px] font-bold text-white">
                    {c.unread}
                  </span>
                )}
              </Link>
            ))}
          </section>
        </div>
      </div>

      {closures.length > 0 && (
        <section className={cn(card, "p-5")}>
          <h2 className="text-[17px] font-bold">Dias fechados chegando</h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {closures.map((c) => (
              <li key={c.id} className="text-[#5c5c5a]">
                <span className="font-semibold text-[#121212]">{c.reason}</span> ·{" "}
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
  );
}
