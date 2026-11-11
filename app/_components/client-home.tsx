import Link from "next/link";
import type { Customer } from "@/app/_lib/auth";
import { formatLongDate, formatShortMonth, formatWeekday, nowInStudio } from "@/app/_lib/availability";
import { endTime } from "@/app/_lib/booking";
import { getCustomerUnreadCount, getMessages } from "@/app/_lib/chat";
import { formatListTime } from "@/app/_lib/chat-format";
import { getReservations, isPast } from "@/app/_lib/reservations";
import { formatDuration, formatPrice } from "@/app/_lib/services";
import { cn } from "@/lib/utils";
import { CalendarIcon, ChatIcon, SwapIcon } from "./icons";
import { PanelHeader } from "./panel-header";
import { card, linkButton, PageTitle, primaryButton, scrollArea, Stat } from "./ui";

function greeting(minutes: number) {
  if (minutes < 12 * 60) return "Bom dia";
  if (minutes < 18 * 60) return "Boa tarde";
  return "Boa noite";
}

/** Início do cliente logado: dentro do painel, com o mesmo menu das outras telas. */
export async function ClientHome({ customer }: { customer: Customer }) {
  const now = nowInStudio();
  const [reservations, unread, messages] = await Promise.all([
    getReservations(customer.id),
    getCustomerUnreadCount(customer.id),
    getMessages(customer.id),
  ]);
  const upcoming = reservations.filter((r) => !isPast(r, now));
  const next = upcoming[0];
  const lastMessage = messages.at(-1);

  return (
    <>
      <PanelHeader>
        <PageTitle
          title={`${greeting(now.minutes)}, ${customer.name.split(" ")[0]}`}
          description={`${formatWeekday(now.date)}, ${formatLongDate(now.date)}`}
        />
      </PanelHeader>

      <div className={cn("mt-7", scrollArea)}>
        <div className="flex flex-col gap-5 pb-1">
          <section className={cn(card, "p-5")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-black">Próximo horário</h2>
              <Link href="/agendamento" className={primaryButton}>
                <CalendarIcon className="size-4" />
                Novo agendamento
              </Link>
            </div>

            {next ? (
              <div className="mt-4 flex gap-5 rounded-xl border border-black/10 bg-white/70 p-5">
                <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r border-black/15 pr-5 text-black">
                  <span className="text-xs font-semibold tracking-widest">{formatShortMonth(next.date)}</span>
                  <span className="text-4xl leading-tight font-bold">{Number(next.date.slice(8))}</span>
                  <span className="text-sm font-semibold">{next.time}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl leading-snug font-semibold text-black">{next.service.name}</h3>
                  <p className="mt-1 text-sm text-black/70">
                    {formatWeekday(next.date)}, {formatLongDate(next.date)} · {next.time} às{" "}
                    {endTime(next.time, next.service.durationMinutes)}
                  </p>
                  <p className="mt-1 text-sm text-black/70">
                    {next.service.professional && <>Profissional: {next.service.professional} · </>}
                    {formatDuration(next.service.durationMinutes)} · {formatPrice(next.service.priceCents)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                    <Link href={`/reservas/${next.id}/remarcar`} className={cn(linkButton, "inline-flex items-center gap-1.5")}>
                      <SwapIcon className="size-4" />
                      Remarcar
                    </Link>
                    <Link href="/reservas" className={linkButton}>
                      Ver todas as reservas
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-black/25 py-10 text-center text-sm text-black/70">
                Você não tem horário marcado. Que tal agendar o próximo?
              </p>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <Stat
              label="RESERVAS MARCADAS"
              value={String(upcoming.length)}
              hint={upcoming.length === 0 ? "Nenhuma no momento" : "Ver em Minhas reservas"}
              href="/reservas"
            />
            <Stat
              label="MENSAGENS NÃO LIDAS"
              value={String(unread)}
              hint={lastMessage ? `Última: ${formatListTime(lastMessage.createdAt)}` : "Fale com o estúdio"}
              href="/mensagens"
            />
          </div>

          {lastMessage && (
            <Link href="/mensagens" className={cn(card, "flex items-center gap-4 p-5 transition hover:border-black/30")}>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#121212] text-white">
                <ChatIcon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-black">
                  {lastMessage.from === "admin" ? "Mensagem do estúdio" : "Você escreveu"}
                </span>
                <span className="block truncate text-sm text-black/70">{lastMessage.text}</span>
              </span>
              {unread > 0 && (
                <span className="min-w-6 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-xs font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
