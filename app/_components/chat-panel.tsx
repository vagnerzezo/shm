"use client";

import { useActionState, useEffect, useOptimistic, type ReactNode } from "react";
import { SendIcon } from "@/app/_components/icons";
import type { SendState } from "@/app/_lib/actions";
import { dayKey, formatClock, formatDay } from "@/app/_lib/chat-format";
import type { ChatMessage, Role } from "@/app/_lib/db";
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
}: {
  me: Role;
  customerId: string;
  messages: ChatMessage[];
  send: (formData: FormData) => Promise<SendState>;
  markRead: () => Promise<void>;
  header: ReactNode;
  label: string;
  placeholder: string;
  emptyText: string;
}) {
  // A mensagem aparece na hora; some e volta "de verdade" quando o servidor responde.
  const [shown, addShown] = useOptimistic(messages, (current, message: ChatMessage) => [
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
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-black/10 bg-white/85"
    >
      <header className="flex items-center gap-3 border-b border-black/10 px-4 py-3">{header}</header>

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

      <form action={submit} className="border-t border-black/10 p-3">
        {state.error && (
          <p role="alert" className="mb-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-800">
            {state.error}
          </p>
        )}
        <InputGroup className="rounded-xl border-black/20 bg-white">
          <InputGroupTextarea
            name="texto"
            required
            maxLength={2000}
            rows={1}
            placeholder={placeholder}
            aria-label="Mensagem"
            className="max-h-40 min-h-11 text-sm"
            onKeyDown={(e) => {
              // Enter envia; Shift+Enter quebra a linha.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <InputGroupAddon align="block-end" className="justify-end">
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-sm"
              disabled={pending}
              aria-label="Enviar"
              className="rounded-full bg-[#121212] text-white hover:bg-black/80"
            >
              <SendIcon className="size-4" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </section>
  );
}
