import Image from "next/image";
import Link from "next/link";
import type { Customer } from "@/app/_lib/auth";
import { formatLongDate, formatShortMonth, formatWeekday, nowInStudio } from "@/app/_lib/availability";
import { endTime } from "@/app/_lib/booking";
import { getCustomerUnreadCount, getMessages } from "@/app/_lib/chat";
import { formatListTime } from "@/app/_lib/chat-format";
import { getReservations, isPast } from "@/app/_lib/reservations";
import { getStudio } from "@/app/_lib/studio";
import { formatDuration, formatPrice } from "@/app/_lib/services";
import { cn } from "@/lib/utils";
import { ChevronRightIcon, PlusIcon } from "./icons";
import { clientCard, clientMuted, ClientTitle, CountBadge } from "./client/ui";

function greeting(minutes: number) {
  if (minutes < 12 * 60) return "Bom dia";
  if (minutes < 18 * 60) return "Boa tarde";
  return "Boa noite";
}

/** "Sex" a partir de "Sexta-feira". */
const shortWeekday = (date: string) => formatWeekday(date).slice(0, 3);

/** Início do cliente logado. */
export async function ClientHome({ customer }: { customer: Customer }) {
  const now = nowInStudio();
  const [reservations, unread, messages, studio] = await Promise.all([
    getReservations(customer.id),
    getCustomerUnreadCount(customer.id),
    getMessages(customer.id),
    getStudio(),
  ]);
  const upcoming = reservations.filter((r) => !isPast(r, now));
  const next = upcoming[0];
  const lastMessage = messages.at(-1);

  return (
    <div className="flex flex-col gap-[18px] lg:gap-6">
      <ClientTitle
        kicker={`${formatWeekday(now.date)}, ${formatLongDate(now.date)}`}
        title={`${greeting(now.minutes)}, ${customer.name.split(" ")[0]}`}
      />

      <div className="flex flex-col gap-[18px] lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-5">
        {/* Próximo horário */}
        <section className="flex flex-col gap-4 rounded-[22px] bg-[#121212] p-[18px] text-white lg:gap-5 lg:rounded-3xl lg:p-7">
          <h2 className="text-xs font-semibold tracking-[0.6px] text-white/70 uppercase lg:text-[13px]">Próximo horário</h2>
          {next ? (
            <>
              <div className="flex items-center gap-3.5 lg:gap-5">
                <span className="w-[58px] shrink-0 rounded-[14px] bg-white/10 py-2 text-center lg:w-[84px] lg:rounded-[18px] lg:py-3">
                  <span className="block text-[11px] font-bold text-white/70 uppercase lg:text-[13px]">{shortWeekday(next.date)}</span>
                  <span className="block text-2xl leading-tight font-bold lg:text-4xl">{Number(next.date.slice(8))}</span>
                  <span className="block text-[11px] font-semibold text-white/70 lg:text-[13px]">{formatShortMonth(next.date)}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-bold break-words lg:text-[26px] lg:leading-tight">{next.service.name}</span>
                  <span className="block text-sm text-white/80 lg:mt-1 lg:text-base">
                    {next.time} – {endTime(next.time, next.service.durationMinutes)} · {formatDuration(next.service.durationMinutes)}
                    {next.service.professional && <span className="max-lg:hidden"> · {next.service.professional}</span>}
                  </span>
                  <span className="block text-sm text-white/80 lg:text-base">
                    {formatPrice(next.service.priceCents)} · pagamento no dia
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 lg:flex lg:gap-2.5">
                <Link
                  href={`/reservas/${next.id}/remarcar`}
                  className="flex h-11 items-center justify-center rounded-xl bg-white px-[18px] text-sm font-semibold text-[#121212] transition hover:bg-white/90"
                >
                  Remarcar
                </Link>
                <Link
                  href="/reservas"
                  className="flex h-11 items-center justify-center rounded-xl border border-white/30 px-[18px] text-sm font-semibold transition hover:bg-white/10"
                >
                  <span className="lg:hidden">Ver reservas</span>
                  <span className="max-lg:hidden">Ver todas as reservas</span>
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-base text-white/80">Você não tem horário marcado. Que tal agendar o próximo?</p>
              <Link
                href="/agendamento"
                className="flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-white px-5 text-sm font-semibold text-[#121212] transition hover:bg-white/90"
              >
                <PlusIcon className="size-4" />
                Agendar
              </Link>
            </>
          )}
        </section>

        <div className="contents lg:flex lg:flex-col lg:gap-5">
          {/* Celular: atalho para agendar (no computador fica na sidebar). */}
          {next && (
            <Link href="/agendamento" className={cn(clientCard, "flex h-14 items-center gap-3 rounded-2xl px-4 lg:hidden")}>
              <span className="grid size-9 place-items-center rounded-[10px] bg-[#f5f5f4]">
                <PlusIcon className="size-5" />
              </span>
              <span className="flex-1 text-[15px] font-semibold">Agendar novo horário</span>
              <ChevronRightIcon className="size-[18px] text-[#a8a29e]" />
            </Link>
          )}

          <section className={cn(clientCard, "grid grid-cols-2 lg:rounded-[20px]")}>
            <Link href="/reservas" className="px-4 py-3.5 lg:px-[22px] lg:py-5">
              <span className="block text-2xl font-bold lg:text-[32px]">{upcoming.length}</span>
              <span className={cn("block text-[13px] lg:text-sm", clientMuted)}>
                {upcoming.length === 1 ? "reserva marcada" : "reservas marcadas"}
              </span>
            </Link>
            <Link href="/mensagens" className="border-l border-[#f0efee] px-4 py-3.5 lg:px-[22px] lg:py-5">
              <span className="block text-2xl font-bold lg:text-[32px]">{unread}</span>
              <span className={cn("block text-[13px] lg:text-sm", clientMuted)}>
                {unread === 1 ? "mensagem nova" : "mensagens novas"}
              </span>
            </Link>
          </section>

          {lastMessage ? (
            <Link
              href="/mensagens"
              className={cn(clientCard, "flex items-center gap-3 px-4 py-3.5 lg:flex-1 lg:flex-col lg:items-stretch lg:rounded-[20px] lg:px-[22px] lg:py-5")}
            >
              <span className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-[#e7e5e4]">
                  <Image src="/img/logo.png" alt="" width={300} height={200} className="h-auto w-[30px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-bold">
                      {studio.name}
                    </span>
                    <span className={cn("shrink-0 text-xs lg:hidden", clientMuted)}>{formatListTime(lastMessage.createdAt)}</span>
                  </span>
                  <span className={cn("block truncate text-sm lg:hidden", unread > 0 ? "font-semibold text-[#3f3f3d]" : clientMuted)}>
                    {lastMessage.from === "cliente" && "Você: "}
                    {lastMessage.text}
                  </span>
                  <span className={cn("block text-[13px] max-lg:hidden", clientMuted)}>
                    Última mensagem · {formatListTime(lastMessage.createdAt)}
                  </span>
                </span>
                <CountBadge count={unread} />
              </span>
              <span className="line-clamp-3 self-start rounded-[6px_16px_16px_16px] bg-[#f5f5f4] px-3.5 py-3 text-[15px] break-words max-lg:hidden">
                {lastMessage.text}
              </span>
              <span className="mt-auto text-sm font-semibold max-lg:hidden">Responder →</span>
            </Link>
          ) : (
            <Link
              href="/mensagens"
              className={cn(clientCard, "flex items-center gap-3 px-4 py-3.5 text-sm font-semibold lg:flex-1 lg:rounded-[20px] lg:px-[22px]")}
            >
              Fale com o estúdio
              <ChevronRightIcon className="ml-auto size-[18px] text-[#a8a29e]" />
            </Link>
          )}
        </div>
      </div>

      {/* Computador: lista das próximas reservas. */}
      {upcoming.length > 0 && (
        <section className={cn(clientCard, "overflow-hidden rounded-[20px] max-lg:hidden")}>
          <div className="flex items-center justify-between border-b border-[#f0efee] px-[22px] py-[18px]">
            <h2 className="text-[17px] font-bold">Suas próximas reservas</h2>
            <Link href="/agendamento" className={cn("text-sm font-semibold hover:text-[#121212]", clientMuted)}>
              + Agendar outro horário
            </Link>
          </div>
          <ul>
            {upcoming.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center gap-4 border-b border-[#f0efee] px-[22px] py-3.5 text-sm last:border-0">
                <span className="w-[110px] shrink-0 font-bold">
                  {shortWeekday(r.date)}, {Number(r.date.slice(8))} {formatShortMonth(r.date).toLowerCase()}
                </span>
                <span className={cn("w-[120px] shrink-0", clientMuted)}>
                  {r.time} – {endTime(r.time, r.service.durationMinutes)}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{r.service.name}</span>
                <span className="font-bold">{formatPrice(r.service.priceCents)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
