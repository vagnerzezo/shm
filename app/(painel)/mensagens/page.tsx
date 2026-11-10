import type { Metadata } from "next";
import Image from "next/image";
import { AutoRefresh } from "@/app/_components/auto-refresh";
import { ChatPanel } from "@/app/_components/chat-panel";
import { PanelHeader } from "@/app/_components/panel-header";
import { markCustomerReadAction, sendCustomerMessage } from "@/app/_lib/actions";
import { requireUser } from "@/app/_lib/auth";
import { getMessages } from "@/app/_lib/chat";
import { getStudio } from "@/app/_lib/studio";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Mensagens | Studio Heitor Macks",
};

export default async function MensagensPage() {
  const user = await requireUser("/mensagens");
  // O admin conversa com todos os clientes pelo painel dele.
  if (user.role === "admin") redirect("/admin/chat");
  const [messages, studio] = await Promise.all([getMessages(user.id), getStudio()]);

  return (
    <>
      <AutoRefresh />
      <PanelHeader>
        <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">Mensagens</h1>
        <p className="mt-1 text-sm text-black/70">
          Avisos sobre seus horários e conversa direta com o estúdio.
        </p>
      </PanelHeader>

      <div className="mt-7 flex min-h-[70vh] flex-1 lg:min-h-0">
        <ChatPanel
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
              <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-black/10 bg-white">
                <Image src="/img/logo.png" alt="" width={300} height={200} className="h-auto w-8" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-black">{studio.name}</h2>
                <p className="truncate text-sm text-black/60">Respondemos assim que possível.</p>
              </div>
            </>
          }
        />
      </div>
    </>
  );
}
