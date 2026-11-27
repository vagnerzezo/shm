export type ChatTab = "conversas" | "todos";

/** Endereço do chat com a aba (`?ver=todos`) e o cliente aberto. */
export function chatHref({ tab, cliente }: { tab: ChatTab; cliente?: string }) {
  const params = new URLSearchParams();
  if (cliente) params.set("cliente", cliente);
  if (tab === "todos") params.set("ver", "todos");
  const query = params.toString();
  return query ? `/admin/chat?${query}` : "/admin/chat";
}
