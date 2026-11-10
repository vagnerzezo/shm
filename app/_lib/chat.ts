import { roleOf } from "./auth";
import { readDb, updateDb, type ChatMessage } from "./db";

export type Conversation = {
  customer: { id: string; name: string; phone: string; email: string };
  lastMessage: ChatMessage | null;
  /** Mensagens do cliente que o admin ainda não abriu. */
  unread: number;
};

const isUnread = (m: ChatMessage) => m.from === "cliente" && !m.readAt;

/** Todos os clientes, com quem falou por último no topo. */
export async function getConversations(): Promise<Conversation[]> {
  const db = await readDb();
  const last = new Map<string, ChatMessage>();
  const unread = new Map<string, number>();
  for (const m of db.messages) {
    if (isUnread(m)) unread.set(m.customerId, (unread.get(m.customerId) ?? 0) + 1);
    const current = last.get(m.customerId);
    if (!current || m.createdAt > current.createdAt) last.set(m.customerId, m);
  }
  return db.users
    .filter((u) => roleOf(u) === "cliente")
    .map((u) => ({
      customer: { id: u.id, name: u.name, phone: u.phone, email: u.email },
      lastMessage: last.get(u.id) ?? null,
      unread: unread.get(u.id) ?? 0,
    }))
    .sort((a, b) => {
      const ta = a.lastMessage?.createdAt ?? "";
      const tb = b.lastMessage?.createdAt ?? "";
      return tb.localeCompare(ta) || a.customer.name.localeCompare(b.customer.name, "pt-BR");
    });
}

/** Conversa de um cliente, em ordem cronológica. */
export async function getMessages(customerId: string): Promise<ChatMessage[]> {
  const db = await readDb();
  return db.messages
    .filter((m) => m.customerId === customerId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Devolve `false` se o cliente não existe. */
export function addMessage(customerId: string, from: ChatMessage["from"], text: string) {
  return updateDb((db) => {
    if (!db.users.some((u) => u.id === customerId)) return false;
    db.messages.push({
      id: crypto.randomUUID(),
      customerId,
      from,
      text,
      createdAt: new Date().toISOString(),
    });
    return true;
  });
}

/** Total de mensagens de clientes ainda não lidas pelo admin. */
export async function getUnreadCount() {
  return (await readDb()).messages.filter(isUnread).length;
}

/** Marca como lidas as mensagens do cliente. Devolve quantas mudaram. */
export function markConversationRead(customerId: string) {
  return updateDb((db) => {
    const now = new Date().toISOString();
    let changed = 0;
    for (const m of db.messages) {
      if (m.customerId === customerId && isUnread(m)) {
        m.readAt = now;
        changed++;
      }
    }
    return changed;
  });
}

const isUnreadByCustomer = (m: ChatMessage, customerId: string) =>
  m.customerId === customerId && m.from === "admin" && !m.readAt;

/** Mensagens do estúdio que o cliente ainda não abriu. */
export async function getCustomerUnreadCount(customerId: string) {
  return (await readDb()).messages.filter((m) => isUnreadByCustomer(m, customerId)).length;
}

/** Cliente abriu a conversa: marca como lidas as mensagens do estúdio. Devolve quantas mudaram. */
export function markReadByCustomer(customerId: string) {
  return updateDb((db) => {
    const now = new Date().toISOString();
    let changed = 0;
    for (const m of db.messages) {
      if (isUnreadByCustomer(m, customerId)) {
        m.readAt = now;
        changed++;
      }
    }
    return changed;
  });
}
