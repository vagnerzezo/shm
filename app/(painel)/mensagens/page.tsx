import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoRefresh } from "@/app/_components/auto-refresh";
import { ChatPanel } from "@/app/_components/chat-panel";
import { clientCard, clientSecondary, ClientTitle } from "@/app/_components/client/ui";
import { UserIcon } from "@/app/_components/icons";
import { markCustomerReadAction, sendCustomerMessage } from "@/app/_lib/actions";
import { keepBarberOut, requireUser } from "@/app/_lib/auth";
import { formatShortMonth, formatWeekday, nowInStudio } from "@/app/_lib/availability";
import { getMessages } from "@/app/_lib/chat";
import { getReservations, isPast } from "@/app/_lib/reservations";
import { getStudio } from "@/app/_lib/studio";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Mensagens | Studio Heitor Macks",
};

export default async function MensagensPage() {
  const user = await requireUser("/mensagens");
  keepBarberOut(user);
  // O admin conversa com todos os clientes pelo painel dele.
  if (user.role === "admin") redirect("/admin/chat");
  const now = nowInStudio();
  const [messages, studio, reservations] = await Promise.all([getMessages(user.id), getStudio(), getReservations(user.id)]);
  const upcoming = reservations.filter((r) => !isPast(r, now)).slice(0, 3);

  return (
    <>
      <AutoRefresh />
      {/* Computador: título + conversa na altura da janela; a conversa rola por dentro. */}
      <div className="lg:flex lg:h-[calc(100dvh-5rem)] lg:min-h-[560px] lg:flex-col">
        <ClientTitle
          className="mb-[22px] max-lg:hidden"
          title="Mensagens"
          description="Avisos sobre seus horários e conversa direta com o estúdio."
        />

      {/* Celular: conversa em tela cheia entre o topo e a tab bar. */}
      <div className="-mx-4 -mt-5 -mb-6 flex h-[calc(100dvh-65px-env(safe-area-inset-bottom))] lg:m-0 lg:grid lg:h-auto lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)] lg:gap-5">
        <ChatPanel
          variant="client"
          me="cliente"
          customerId={user.id}
          messages={messages}
          send={sendCustomerMessage}
          markRead={markCustomerReadAction}
          label={`Conversa com ${studio.name}`}
          placeholder="Escreva para o estúdio"
          emptyText="Nenhuma mensagem ainda. Tire dúvidas, peça um horário ou avise algo ao estúdio."
          header={
            <>
              <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-[#e7e5e4] bg-white lg:size-11">
                <Image src="/img/logo.png" alt="" width={300} height={200} className="h-auto w-7 lg:w-[30px]" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold">{studio.name}</h2>
                <p className="truncate text-xs text-[#5c5c5a] lg:text-[13px]">Respondemos assim que possível</p>
              </div>
              <Link href="/conta" aria-label="Meus dados" className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-black/5 lg:hidden">
                <UserIcon className="size-[22px]" />
              </Link>
            </>
          }
        />

        {/* Computador: próximos horários ao lado da conversa. */}
        <aside className={cn(clientCard, "self-start rounded-[20px] px-5 py-[18px] max-lg:hidden")}>
          <h2 className="mb-3 text-[15px] font-bold">Seus próximos horários</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-[#5c5c5a]">
              Nenhum horário marcado.{" "}
              <Link href="/agendamento" className="font-semibold text-[#121212] underline underline-offset-4">
                Agendar
              </Link>
            </p>
          ) : (
            <ul>
              {upcoming.map((r) => (
                <li key={r.id} className="border-b border-[#f0efee] py-2.5 text-sm last:border-0">
                  <b>
                    {formatWeekday(r.date).slice(0, 3)}, {Number(r.date.slice(8))} {formatShortMonth(r.date).toLowerCase()} · {r.time}
                  </b>
                  <span className="block truncate text-[#5c5c5a]">{r.service.name}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/reservas" className={cn(clientSecondary, "mt-2 w-full")}>
            Ver reservas
          </Link>
        </aside>
      </div>
      </div>
    </>
  );
}
