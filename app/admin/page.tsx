import type { Metadata } from "next";
import Link from "next/link";
import { ChatIcon, PlusIcon } from "@/app/_components/icons";
import { PanelHeader } from "@/app/_components/panel-header";
import { Badge, card, linkButton, PageTitle, primaryButton, scrollArea, Stat } from "@/app/_components/ui";
import { agendaHref, toneOf, weekStart } from "@/app/_lib/agenda";
import { requireAdmin } from "@/app/_lib/auth";
import { addDays, formatLongDate, formatWeekday, nowInStudio } from "@/app/_lib/availability";
import { endTime } from "@/app/_lib/booking";
import { getCatalog } from "@/app/_lib/catalog";
import { getConversations } from "@/app/_lib/chat";
import { formatListTime } from "@/app/_lib/chat-format";
import { readDb } from "@/app/_lib/db";
import { shortDate } from "@/app/_lib/format";
import { getAgenda, isDone, statusOf } from "@/app/_lib/reservations";
import { formatPrice } from "@/app/_lib/services";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Início | Studio Heitor Macks",
};

function greeting(minutes: number) {
  if (minutes < 12 * 60) return "Bom dia";
  if (minutes < 18 * 60) return "Boa tarde";
  return "Boa noite";
}

export default async function AdminHomePage() {
  const admin = await requireAdmin("/admin");
  const now = nowInStudio();
  const monday = weekStart(now.date);
  const [agenda, conversations, catalog, db] = await Promise.all([
    getAgenda(monday, addDays(now.date, 7)),
    getConversations(),
    getCatalog(),
    readDb(),
  ]);

  const today = agenda.filter((r) => r.date === now.date);
  const remaining = today.filter((r) => statusOf(r, now) === "agendado");
  const weekDone = agenda.filter((r) => r.date <= now.date && isDone(r, now));
  const weekRevenue = weekDone.reduce((sum, r) => sum + r.service.priceCents, 0);
  const unread = conversations.filter((c) => c.unread > 0);
  const unreadTotal = unread.reduce((sum, c) => sum + c.unread, 0);
  const monthAgo = addDays(now.date, -30);
  const failures = db.dispatches.filter((d) => d.status === "falha" && d.updatedAt.slice(0, 10) >= monthAgo).length;
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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          <Stat
            label="MENSAGENS NÃO LIDAS"
            value={String(unreadTotal)}
            hint={unread.length ? `De ${unread.length} ${unread.length === 1 ? "cliente" : "clientes"}` : "Tudo respondido"}
            href="/admin/chat"
          />
          <Stat
            label="FALHAS DE ENVIO"
            value={String(failures)}
            hint="Marketing, últimos 30 dias"
            href="/admin/marketing/historico?status=falha"
          />
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className={cn(card, "p-5")}>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="mr-auto text-lg font-bold text-black">Agenda de hoje</h2>
              <Link href={`/admin/agenda/nova?data=${now.date}`} className={cn(primaryButton, "h-9 px-3")}>
                <PlusIcon className="size-4" />
                Nova reserva
              </Link>
            </div>
            {today.length === 0 ? (
              <p className="mt-3 text-sm text-black/60">Nenhum horário marcado para hoje.</p>
            ) : (
              <ul className="mt-3 divide-y divide-black/10">
                {today.map((r) => {
                  const status = statusOf(r, now);
                  return (
                    <li key={r.id}>
                      <Link
                        href={agendaHref("dia", r.date, r.id)}
                        className="flex items-center gap-3 py-2.5 hover:bg-black/[0.02]"
                      >
                        <span className={cn("w-1 self-stretch rounded-full", toneOf(r, catalog.professionals).dot)} />
                        <span className="w-24 shrink-0 text-sm font-semibold text-black">
                          {r.time}–{endTime(r.time, r.service.durationMinutes)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-black">{r.customer.name}</span>
                          <span className="block truncate text-xs text-black/60">{r.service.name}</span>
                        </span>
                        {status === "agendado" ? (
                          <Badge tone="outline">A seguir</Badge>
                        ) : status === "faltou" ? (
                          <Badge tone="red">Faltou</Badge>
                        ) : r.attendance === "compareceu" ? (
                          <Badge tone="green">Veio</Badge>
                        ) : (
                          <Badge tone="amber">Confirmar</Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            <h3 className="mt-5 text-xs font-semibold tracking-widest text-black/60">PRÓXIMOS DIAS</h3>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
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

            <section className={cn(card, "p-5")}>
              <div className="flex items-center gap-2">
                <h2 className="mr-auto text-lg font-bold text-black">Mensagens</h2>
                <Link href="/admin/chat" className={linkButton}>
                  Abrir chat
                </Link>
              </div>
              {unread.length === 0 ? (
                <p className="mt-2 text-sm text-black/60">Nenhuma mensagem esperando resposta.</p>
              ) : (
                <ul className="mt-3 divide-y divide-black/10">
                  {unread.slice(0, 5).map(({ customer, lastMessage, unread: count }) => (
                    <li key={customer.id}>
                      <Link href={`/admin/chat?cliente=${customer.id}`} className="flex items-center gap-3 py-2.5">
                        <ChatIcon className="size-4 shrink-0 text-black/50" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-black">{customer.name}</span>
                          <span className="block truncate text-xs text-black/60">{lastMessage?.text}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          {lastMessage && (
                            <span className="block text-xs text-black/50">{formatListTime(lastMessage.createdAt)}</span>
                          )}
                          <span className="inline-block min-w-5 rounded-full bg-red-600 px-1.5 text-center text-xs leading-5 font-bold text-white">
                            {count}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

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
