import { DomainError } from "../errors";

// Regras do chat do cliente com o estúdio.

export const MESSAGE_MAX = 2000;

/** Quebras de linha `\r\n` (como o navegador envia um <textarea>) viram `\n`. */
export const normalizeNewlines = (text: string) => text.replace(/\r\n?/g, "\n");

/** Texto da mensagem sem espaços nas pontas. Vazio ou acima do limite é erro (nunca corta). */
export function messageText(text: unknown): string {
  const clean = typeof text === "string" ? normalizeNewlines(text).trim() : "";
  const fail = (message: string) => new DomainError("validation", message, { text: message });
  if (!clean) throw fail("Escreva a mensagem.");
  if (clean.length > MESSAGE_MAX) throw fail(`A mensagem pode ter no máximo ${MESSAGE_MAX} caracteres.`);
  return clean;
}

/** Mensagens depois da de id `after`, ou todas se o id não estiver na lista. */
export function messagesAfter<T extends { id: string }>(messages: T[], after?: string): T[] {
  const index = after ? messages.findIndex((m) => m.id === after) : -1;
  return index === -1 ? messages : messages.slice(index + 1);
}
