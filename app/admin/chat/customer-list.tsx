"use client";

import Link from "next/link";
import { useState } from "react";
import { CountBadge } from "@/app/_components/client/ui";
import { SearchIcon } from "@/app/_components/icons";
import { formatListTime, initials } from "@/app/_lib/chat-format";
import type { Conversation } from "@/app/_lib/chat";
import { normalize } from "@/app/_lib/format";
import { cn } from "@/lib/utils";
import { chatHref, type ChatTab } from "./href";

export function CustomerList({
  conversations,
  selectedId,
  tab,
  className,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  /** "Conversas" mostra só quem já trocou mensagem; a busca procura em todos. */
  tab: ChatTab;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const q = normalize(query.trim());
  const digits = query.replace(/\D/g, "");
  const withMessages = conversations.filter((c) => c.lastMessage);
  const base = q || tab === "todos" ? conversations : withMessages;
  const visible = base.filter(({ customer }) =>
    !q ||
    normalize(customer.name).includes(q) ||
    customer.email.includes(q) ||
    (digits.length > 0 && customer.phone.includes(digits)),
  );

  return (
    <aside
      aria-label="Clientes"
      className={cn(
        "min-h-0 w-full shrink-0 flex-col rounded-[18px] border border-[#e7e5e4] bg-white lg:w-[360px] lg:rounded-none lg:border-0 lg:border-r lg:border-[#f0efee]",
        className,
      )}
    >
      <div className="flex flex-col gap-3 border-b border-[#f0efee] p-4">
        <label className="relative">
          <span className="sr-only">Buscar cliente</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-[#5c5c5a]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente"
            className="h-11 w-full rounded-[10px] border border-[#e7e5e4] bg-[#fafaf9] pr-3 pl-[38px] text-base placeholder:text-[#6b6b69] focus:border-[#121212] focus:outline-none lg:h-10 lg:text-sm"
          />
        </label>
        {!q && (
          <nav aria-label="Mostrar" className="grid grid-cols-2 rounded-[10px] bg-[#f0efee] p-[3px]">
            {(
              [
                ["conversas", `Conversas (${withMessages.length})`],
                ["todos", "Todos os clientes"],
              ] as const
            ).map(([id, label]) => (
              <Link
                key={id}
                href={chatHref({ tab: id, cliente: selectedId ?? undefined })}
                replace
                scroll={false}
                aria-current={tab === id ? "page" : undefined}
                className={cn(
                  "grid h-9 place-items-center rounded-lg text-[13px] font-semibold transition lg:h-8",
                  tab === id ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]" : "text-[#5c5c5a] hover:text-[#121212]",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="p-6 text-center text-sm text-[#5c5c5a]">
          {conversations.length === 0
            ? "Nenhum cliente cadastrado."
            : q
              ? "Nenhum cliente encontrado."
              : "Nenhuma conversa ainda. Veja “Todos os clientes” para começar uma."}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:thin]">
          {visible.map(({ customer, lastMessage, unread }) => {
            const active = customer.id === selectedId;
            return (
              <li key={customer.id}>
                <Link
                  href={chatHref({ tab, cliente: customer.id })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-[14px] p-3 transition",
                    active ? "bg-[#121212] text-white" : "hover:bg-[#f5f5f4]",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold",
                      active ? "bg-white text-[#121212]" : "bg-[#f0efee]",
                    )}
                  >
                    {initials(customer.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-[15px]", unread > 0 ? "font-bold" : "font-semibold")}>
                        {customer.name}
                      </span>
                      {lastMessage && (
                        <span className={cn("shrink-0 text-xs", active ? "text-white/70" : "text-[#6b6b69]")}>
                          {formatListTime(lastMessage.createdAt)}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "block min-w-0 flex-1 truncate text-[13px]",
                          active ? "text-white/70" : unread > 0 ? "font-semibold text-[#121212]" : "text-[#5c5c5a]",
                        )}
                      >
                        {lastMessage
                          ? `${lastMessage.from === "admin" ? "Você: " : ""}${lastMessage.text}`
                          : "Nenhuma mensagem ainda"}
                      </span>
                      {!active && <CountBadge count={unread} className="shrink-0" />}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
