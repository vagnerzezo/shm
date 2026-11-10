import { unsubscribeByToken } from "@/app/_lib/unsubscribe";

// Descadastro de um clique (RFC 8058): o Gmail/Outlook faz POST aqui quando a
// pessoa usa o botão "Cancelar inscrição" do próprio app de e-mail.
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const ok = await unsubscribeByToken(token);
  return new Response(null, { status: ok ? 200 : 404 });
}
