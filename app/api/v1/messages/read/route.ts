import { requireAuth } from "@/app/_lib/api/auth";
import { handle } from "@/app/_lib/api/http";
import { markReadByCustomer } from "@/app/_lib/chat";

// Cliente abriu a conversa: as mensagens do estúdio ficam lidas.
export const POST = handle(async () => {
  const me = await requireAuth(["cliente"]);
  return { marked: await markReadByCustomer(me.id) };
});
