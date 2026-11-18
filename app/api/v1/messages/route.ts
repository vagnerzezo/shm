import { requireAuth } from "@/app/_lib/api/auth";
import { created, handle, readBody } from "@/app/_lib/api/http";
import { queryParam } from "@/app/_lib/api/params";
import { messageJson } from "@/app/_lib/api/serialize";
import { addMessage, getCustomerUnreadCount, getMessages } from "@/app/_lib/chat";
import { messagesAfter, messageText } from "@/app/_lib/domain/messages";
import { DomainError } from "@/app/_lib/errors";

// Conversa do cliente com o estúdio. `after=<id>`: só as posteriores (para o app buscar o que chegou).
export const GET = handle(async (request) => {
  const me = await requireAuth(["cliente"]);
  const after = queryParam(new URL(request.url), "after");
  const [all, unread] = await Promise.all([getMessages(me.id), getCustomerUnreadCount(me.id)]);
  return { messages: messagesAfter(all, after).map(messageJson), unread };
});

export const POST = handle(async (request) => {
  const me = await requireAuth(["cliente"]);
  const text = messageText((await readBody(request)).text);
  const message = await addMessage(me.id, "cliente", text);
  if (!message) throw new DomainError("unauthenticated", "Entre na sua conta para continuar.");
  return created({ message: messageJson(message) });
});
