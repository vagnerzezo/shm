import { promises as fs } from "node:fs";
import path from "node:path";
import { IMAGE_DIR, IMAGE_NAME_RE, IMAGE_TYPES } from "@/app/_lib/marketing-images";

// Pública: as imagens aparecem nos e-mails enviados aos clientes.
export async function GET(_request: Request, ctx: RouteContext<"/api/marketing/imagens/[arquivo]">) {
  const { arquivo } = await ctx.params;
  if (!IMAGE_NAME_RE.test(arquivo)) return new Response("Não encontrado.", { status: 404 });
  const ext = arquivo.split(".").pop() as keyof typeof IMAGE_TYPES;
  try {
    const bytes = await fs.readFile(path.join(IMAGE_DIR, arquivo));
    return new Response(bytes, {
      headers: {
        "Content-Type": IMAGE_TYPES[ext],
        // O nome é aleatório e o arquivo nunca muda.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Não encontrado.", { status: 404 });
  }
}
