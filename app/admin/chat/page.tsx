import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/app/_components/auto-refresh";
import { ChatPanel } from "@/app/_components/chat-panel";
import { clientSecondary } from "@/app/_components/client/ui";
import { ArrowLeftIcon, ChatIcon } from "@/app/_components/icons";
import { PanelHeader } from "@/app/_components/panel-header";
import { PageTitle } from "@/app/_components/ui";
import { markConversationReadAction, sendMessage } from "@/app/_lib/actions";
import { requireMenu } from "@/app/_lib/auth";
import { getConversations, getMessages } from "@/app/_lib/chat";
import { initials } from "@/app/_lib/chat-format";
import { formatPhone } from "@/app/_lib/format";
import { cn } from "@/lib/utils";
import { CustomerList } from "./customer-list";
import { chatHref, type ChatTab } from "./href";

export const metadata: Metadata = {
  title: "Chat | Studio Heitor Macks",
};

export default async function AdminChatPage(props: PageProps<"/admin/chat">) {
  const { cliente, ver } = await props.searchParams;
  const tab: ChatTab = ver === "todos" ? "todos" : "conversas";
  const { scope } = await requireMenu("chat", "/admin/chat");
  // Barbeiro: só os clientes dele; cliente de outro não abre (fica sem seleção).
  const conversations = await getConversations(scope);
  const selected = conversations.find((c) => c.customer.id === cliente)?.customer ?? null;
  const messages = selected ? await getMessages(selected.id) : [];

  return (
    <>
      <AutoRefresh />
      {/* Computador: título + cartão na altura da janela; lista e conversa rolam por dentro. */}
      <div className="lg:flex lg:min-h-[560px] lg:flex-1 lg:flex-col">
        <div className={cn("mb-5", selected && "max-lg:hidden")}>
          <PanelHeader>
            <PageTitle
              title="Chat"
              description={
                scope.all ? "Conversas com os clientes do estúdio." : `Conversas com os seus clientes (${scope.professional}).`
              }
            />
          </PanelHeader>
        </div>

        <section
          className={cn(
            "flex lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:rounded-[20px] lg:border lg:border-[#e7e5e4] lg:bg-white",
            // Celular com conversa aberta: tela cheia entre o topo e a tab bar.
            selected && "max-lg:-mx-4 max-lg:-mt-5 max-lg:-mb-6 max-lg:h-[calc(100dvh-65px-env(safe-area-inset-bottom))]",
          )}
          {...(selected ? { "data-tela-cheia": "" } : {})}
        >
          {/* No celular mostra a lista ou a conversa; no computador, as duas lado a lado. */}
          <CustomerList
            conversations={conversations}
            selectedId={selected?.id ?? null}
            tab={tab}
            className={selected ? "hidden lg:flex" : "flex"}
          />

          {selected ? (
            <ChatPanel
              key={selected.id}
              variant="client"
              className="lg:rounded-none lg:border-0"
              me="admin"
              customerId={selected.id}
              messages={messages}
              send={sendMessage.bind(null, selected.id)}
              markRead={markConversationReadAction.bind(null, selected.id)}
              label={`Conversa com ${selected.name}`}
              placeholder={`Mensagem para ${selected.name.split(" ")[0]}`}
              emptyText="Nenhuma mensagem ainda. Escreva abaixo para começar a conversa."
              header={
                <>
                  <Link
                    href={chatHref({ tab })}
                    aria-label="Voltar para a lista de clientes"
                    className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-black/5 lg:hidden"
                  >
                    <ArrowLeftIcon className="size-5" />
                  </Link>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f0efee] text-sm font-bold lg:size-11">
                    {initials(selected.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-bold">{selected.name}</h2>
                    <p className="truncate text-xs text-[#5c5c5a] lg:text-[13px]">
                      {formatPhone(selected.phone)} · {selected.email}
                    </p>
                  </div>
                </>
              }
            />
          ) : (
            <div className="hidden flex-1 flex-col items-center justify-center gap-2.5 bg-[#fafaf9] p-10 text-center lg:flex">
              <span className="grid size-16 place-items-center rounded-[20px] border border-[#e7e5e4] bg-white text-[#5c5c5a]">
                <ChatIcon className="size-7" />
              </span>
              <p className="mt-2 text-lg font-bold">Escolha uma conversa</p>
              <p className="max-w-[360px] text-sm leading-normal text-[#5c5c5a]">
                Selecione um cliente à esquerda para ver as mensagens, ou abra “Todos os clientes” para começar uma conversa
                nova.
              </p>
              {tab !== "todos" && (
                <Link href={chatHref({ tab: "todos" })} className={cn(clientSecondary, "mt-2")}>
                  Ver todos os clientes
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
