"use client";

import { useActionState, useEffect, useOptimistic, type ReactNode } from "react";
import { SendIcon } from "@/app/_components/icons";
import { cn } from "@/lib/utils";
import type { SendState } from "@/app/_lib/actions";
import { dayKey, formatClock, formatDay } from "@/app/_lib/chat-format";
import type { ShownMessage } from "@/app/_lib/chat";
import type { Role } from "@/app/_lib/db";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Message, MessageContent, MessageFooter } from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";

/**
 * Conversa de um cliente com o estúdio, usada pelo admin e pelo próprio cliente.
 * `me` diz de que lado está quem vê: as mensagens dele ficam à direita.
 */
export function ChatPanel({
  me,
  customerId,
  messages,
  send,
  markRead,
  header,
  label,
  placeholder,
  emptyText,
  variant = "panel",
  className,
}: {
  me: Role;
  customerId: string;
  messages: ShownMessage[];
  send: (formData: FormData) => Promise<SendState>;
  markRead: () => Promise<void>;
  header: ReactNode;
  label: string;
  placeholder: string;
  emptyText: string;
  /** `client`: visual da área do cliente (tela cheia no celular). O admin usa `panel`. */
  variant?: "panel" | "client";
  className?: string;
}) {
  const client = variant === "client";
  // A mensagem aparece na hora; some e volta "de verdade" quando o servidor responde.
  const [shown, addShown] = useOptimistic(messages, (current, message: ShownMessage) => [
    ...current,
    message,
  ]);
  const [state, submit, pending] = useActionState<SendState, FormData>(async (_prev, formData) => {
    const text = String(formData.get("texto") ?? "").trim();
    if (!text) return { error: null };
    addShown({
      id: `pendente-${crypto.randomUUID()}`,
      customerId,
      from: me,
      text,
      createdAt: new Date().toISOString(),
    });
    return send(formData);
  }, { error: null });

  // Abrir a conversa (ou chegar mensagem nova com ela aberta) marca como lida.
  const unread = messages.some((m) => m.from !== me && !m.readAt);
  useEffect(() => {
    if (unread && document.visibilityState === "visible") void markRead();
  }, [unread, markRead]);

  return (
    <section
      aria-label={label}
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
        client
          ? "bg-[#f5f5f4] lg:rounded-[20px] lg:border lg:border-[#e7e5e4] lg:bg-[#fafaf9]"
          : "rounded-xl border border-black/10 bg-white/85",
        className,
      )}
    >
      <header
        className={cn(
          "flex items-center gap-3",
          client
            ? "min-h-16 shrink-0 border-b border-black/8 bg-white pt-[env(safe-area-inset-top)] pr-2 pl-4 lg:border-[#f0efee] lg:px-5 lg:py-4"
            : "border-b border-black/10 px-4 py-3",
        )}
      >
        {header}
      </header>

      <MessageScrollerProvider autoScroll defaultScrollPosition="end">
        <MessageScroller className="flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="gap-3 px-4 py-6">
              {shown.length === 0 && <p className="m-auto text-center text-sm text-black/60">{emptyText}</p>}
              {shown.map((m, i) => {
                const mine = m.from === me;
                const align = mine ? "end" : "start";
                const newDay = i === 0 || dayKey(shown[i - 1].createdAt) !== dayKey(m.createdAt);
                return (
                  <MessageScrollerItem key={m.id} messageId={m.id} scrollAnchor={mine}>
                    {newDay && (
                      <p className="mb-3 text-center text-xs font-semibold tracking-widest text-black/50 uppercase">
                        {formatDay(m.createdAt)}
                      </p>
                    )}
                    <Message align={align}>
                      <MessageContent>
                        {/* Quem da equipe escreveu: para o cliente sempre (ou "Estúdio"); para a equipe, quando houver. */}
                        {m.from !== "cliente" && (me === "cliente" || m.authorName) && (
                          <p className={`mb-1 text-xs font-semibold text-black/60 ${mine ? "text-right" : ""}`}>
                            {m.authorName ?? "Estúdio"}
                          </p>
                        )}
                        <Bubble align={align} variant={mine ? "default" : "outline"}>
                          <BubbleContent className="whitespace-pre-wrap">{m.text}</BubbleContent>
                        </Bubble>
                        <MessageFooter>
                          {m.id.startsWith("pendente-") ? "Enviando..." : formatClock(m.createdAt)}
                        </MessageFooter>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                );
              })}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <form
        action={submit}
        className={cn("border-t", client ? "border-black/8 bg-white px-3 py-2.5 lg:border-[#f0efee] lg:px-4 lg:py-3.5" : "border-black/10 p-3")}
      >
        {state.error && (
          <p role="alert" className="mb-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-800">
            {state.error}
          </p>
        )}
        <InputGroup className={client ? "rounded-[22px] border-[#e7e5e4] bg-[#f5f5f4] lg:rounded-[14px]" : "rounded-xl border-black/20 bg-white"}>
          <InputGroupTextarea
            name="texto"
            required
            maxLength={2000}
            rows={1}
            placeholder={placeholder}
            aria-label="Mensagem"
            className={cn("max-h-40 min-h-11", client ? "py-2.5 pl-4 text-base lg:text-[15px]" : "text-sm")}
            onKeyDown={(e) => {
              // Enter envia; Shift+Enter quebra a linha.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <InputGroupAddon align={client ? "inline-end" : "block-end"} className={client ? "self-end pb-1 pr-1" : "justify-end"}>
            <InputGroupButton
              type="submit"
              variant="default"
              size={client ? "sm" : "icon-sm"}
              disabled={pending}
              aria-label="Enviar"
              className={cn(
                "bg-[#121212] text-white hover:bg-black/80",
                client ? "size-9 rounded-full lg:h-9 lg:w-auto lg:rounded-[10px] lg:px-4" : "rounded-full",
              )}
            >
              {client && <span className="max-lg:hidden">Enviar</span>}
              <SendIcon className="size-4" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </section>
  );
}
