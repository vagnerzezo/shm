import type { Scope } from "./access";
import { roleOf } from "./auth";
import { getCustomers } from "./customers";
import { readDb, updateDb, type ChatMessage, type User } from "./db";

export type Conversation = {
  customer: { id: string; name: string; phone: string; email: string };
  lastMessage: ChatMessage | null;
  /** Mensagens do cliente que o admin ainda não abriu. */
  unread: number;
};

const isUnread = (m: ChatMessage) => m.from === "cliente" && !m.readAt;

/** Clientes que o escopo vê no chat: barbeiro, os da ficha dele (horário com ele ou cadastrados por ele). */
async function chatCustomerIds(scope?: Scope): Promise<Set<string> | null> {
  if (!scope || scope.all) return null;
  return new Set((await getCustomers(scope, "ficha")).map((c) => c.id));
}

/** Todos os clientes (barbeiro: só os dele), com quem falou por último no topo. */
export async function getConversations(scope?: Scope): Promise<Conversation[]> {
  const allowed = await chatCustomerIds(scope);
  const db = await readDb();
  const last = new Map<string, ChatMessage>();
  const unread = new Map<string, number>();
  for (const m of db.messages) {
    if (isUnread(m)) unread.set(m.customerId, (unread.get(m.customerId) ?? 0) + 1);
    const current = last.get(m.customerId);
    if (!current || m.createdAt > current.createdAt) last.set(m.customerId, m);
  }
  return db.users
    .filter((u) => roleOf(u) === "cliente" && (!allowed || allowed.has(u.id)))
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
/** Mensagem como aparece na tela e na API: com o primeiro nome de quem da equipe escreveu. */
export type ShownMessage = ChatMessage & { authorName?: string };

export async function getMessages(customerId: string): Promise<ShownMessage[]> {
  const db = await readDb();
  return db.messages
    .filter((m) => m.customerId === customerId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((m) => {
      const authorName = authorNameOf(m, db.users);
      return authorName ? { ...m, authorName } : m;
    });
}

/**
 * Devolve a mensagem gravada, ou `null` se o cliente não existe. `authorId`:
 * quem da equipe escreveu (ignorado em mensagem do cliente).
 */
export function addMessage(
  customerId: string,
  from: ChatMessage["from"],
  text: string,
  authorId?: string,
): Promise<ChatMessage | null> {
  return updateDb((db) => {
    if (!db.users.some((u) => u.id === customerId)) return null;
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      customerId,
      from,
      text,
      createdAt: new Date().toISOString(),
      ...(from !== "cliente" && authorId && { authorId }),
    };
    db.messages.push(message);
    return { ...message };
  });
}

/** Total de mensagens de clientes ainda não lidas pela equipe (barbeiro: só dos clientes dele). */
export async function getUnreadCount(scope?: Scope) {
  const allowed = await chatCustomerIds(scope);
  return (await readDb()).messages.filter((m) => isUnread(m) && (!allowed || allowed.has(m.customerId))).length;
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

/** Primeiro nome de quem da equipe escreveu, ou `null` (a tela mostra "Estúdio"). */
export function authorNameOf(m: ChatMessage, users: Pick<User, "id" | "name">[]): string | null {
  if (m.from === "cliente" || !m.authorId) return null;
  return users.find((u) => u.id === m.authorId)?.name.split(" ")[0] ?? null;
}
