"use client";

import Link from "next/link";
import { useState } from "react";
import { SearchIcon } from "@/app/_components/icons";
import { formatListTime, initials } from "@/app/_lib/chat-format";
import type { Conversation } from "@/app/_lib/chat";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { normalize } from "@/app/_lib/format";
import { cn } from "@/lib/utils";


export function CustomerList({
  conversations,
  selectedId,
  className,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  // "Conversas" mostra só quem já trocou mensagem; a busca procura em todos.
  const [tab, setTab] = useState<"conversas" | "todos">("conversas");
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
        "min-h-0 w-full shrink-0 flex-col rounded-xl border border-black/10 bg-white/85 lg:w-80",
        className,
      )}
    >
      <div className="border-b border-black/10 p-3">
        <InputGroup className="h-11 rounded-lg border-black/20 bg-white">
          <InputGroupAddon>
            <SearchIcon className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente"
            aria-label="Buscar cliente"
          />
        </InputGroup>
        {!q && (
          <div role="tablist" aria-label="Mostrar" className="mt-2 flex gap-1 rounded-lg bg-black/5 p-1">
            {(
              [
                ["conversas", `Conversas (${withMessages.length})`],
                ["todos", "Todos os clientes"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "h-8 flex-1 rounded-md text-xs font-semibold transition",
                  tab === id ? "bg-white text-black shadow-sm" : "text-black/60 hover:text-black",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="p-6 text-center text-sm text-black/70">
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
                  href={`/admin/chat?cliente=${customer.id}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 transition",
                    active ? "bg-[#121212] text-white" : "text-black hover:bg-black/5",
                  )}
                >
                  <Avatar size="lg">
                    <AvatarFallback
                      className={cn("font-semibold", active ? "bg-white text-black" : "bg-black/10 text-black")}
                    >
                      {initials(customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate", unread > 0 ? "font-bold" : "font-semibold")}>{customer.name}</span>
                      {lastMessage && (
                        <span className={cn("shrink-0 text-xs", active ? "text-white/70" : "text-black/60")}>
                          {formatListTime(lastMessage.createdAt)}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "block min-w-0 flex-1 truncate text-sm",
                          active ? "text-white/70" : unread > 0 ? "font-semibold text-black" : "text-black/60",
                        )}
                      >
                        {lastMessage
                          ? `${lastMessage.from === "admin" ? "Você: " : ""}${lastMessage.text}`
                          : "Nenhuma mensagem ainda"}
                      </span>
                      {unread > 0 && !active && (
                        <span
                          aria-label={`${unread} não ${unread === 1 ? "lida" : "lidas"}`}
                          className="min-w-5 shrink-0 rounded-full bg-red-600 px-1.5 text-center text-xs leading-5 font-bold text-white"
                        >
                          {unread}
                        </span>
                      )}
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
