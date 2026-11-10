import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/app/_components/auto-refresh";
import { ChatPanel } from "@/app/_components/chat-panel";
import { ArrowLeftIcon } from "@/app/_components/icons";
import { PanelHeader } from "@/app/_components/panel-header";
import { markConversationReadAction, sendMessage } from "@/app/_lib/actions";
import { requireAdmin } from "@/app/_lib/auth";
import { getConversations, getMessages } from "@/app/_lib/chat";
import { initials } from "@/app/_lib/chat-format";
import { formatPhone } from "@/app/_lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CustomerList } from "./customer-list";

export const metadata: Metadata = {
  title: "Chat | Studio Heitor Macks",
};

export default async function AdminChatPage(props: PageProps<"/admin/chat">) {
  const { cliente } = await props.searchParams;
  await requireAdmin("/admin/chat");
  const conversations = await getConversations();
  const selected = conversations.find((c) => c.customer.id === cliente)?.customer ?? null;
  const messages = selected ? await getMessages(selected.id) : [];

  return (
    <>
      <AutoRefresh />
      <PanelHeader>
        <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">Chat</h1>
        <p className="mt-1 text-sm text-black/70">Conversas com os clientes do estúdio.</p>
      </PanelHeader>

      <div className="mt-7 flex min-h-[70vh] flex-1 gap-4 lg:min-h-0">
        {/* No mobile mostra a lista ou a conversa; no desktop, as duas lado a lado. */}
        <CustomerList
          conversations={conversations}
          selectedId={selected?.id ?? null}
          className={selected ? "hidden lg:flex" : "flex"}
        />

        {selected ? (
          <ChatPanel
            key={selected.id}
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
                  href="/admin/chat"
                  aria-label="Voltar para a lista de clientes"
                  className="grid size-9 place-items-center rounded-full text-black hover:bg-black/5 lg:hidden"
                >
                  <ArrowLeftIcon className="size-4" />
                </Link>
                <Avatar size="lg">
                  <AvatarFallback className="bg-black/10 font-semibold text-black">
                    {initials(selected.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-black">{selected.name}</h2>
                  <p className="truncate text-sm text-black/60">
                    {formatPhone(selected.phone)} · {selected.email}
                  </p>
                </div>
              </>
            }
          />
        ) : (
          <div className="hidden flex-1 items-center justify-center rounded-xl border border-dashed border-black/25 text-center text-black/70 lg:flex">
            Selecione um cliente para ver a conversa.
          </div>
        )}
      </div>
    </>
  );
}
